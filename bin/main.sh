#!/usr/bin/env bash

shopt -s globstar extglob

NAME=$(basename "$0")
ROOT=$(dirname "$(dirname "$(readlink -f "$0")")")
PORT_FORWARDER=$(wslpath -aw "$ROOT"/port-forwarder.ps1 2>/dev/null)

function print_red() { printf '\e[1;31m%b%s\e[0m' "$1"; }
function print_blue() { printf '\e[1;36m%b%s\e[0m' "$1"; }
function read_blue() { read -p $'\e[1;36m'"$1"$'\e[0m' "$2"; }

# Checks whether script is running on "WSL"
function assert_wsl() {
    if ! grep -qi microsoft /proc/version &>/dev/null; then
        print_red ">> This script must run on Windows Subsystem for Linux\n"
        exit 1
    fi
}

# Exports development environment to the "Windows Terminal"
function windows_terminal() {
    assert_wsl
    local args_trimmed=''
    for arg in "$1"; do
        if [[ $arg == --* ]]; then
            [[ $arg != '--windows-terminal' ]] && args_trimmed+=" $arg"
        elif [[ $arg == -* ]]; then
            arg=$(sed 's/t//g' <<< "$arg")
            [[ $arg != '-' ]] && args_trimmed+=" $arg"
        fi
    done

    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden \
        wt.exe "--window 0 new-tab --profile $WSL_DISTRO_NAME --title MatchMoji \
                --tabColor '#025338' --suppressApplicationTitle \
                wsl.exe -e bash -c '"$ROOT/bin/$NAME" $args_trimmed\; exec bash'"
}

# Runs TypeScript modules
function typescript_run() {
    cd "$ROOT"
    npx tsc --module nodenext --moduleResolution nodenext "$1.mts"
    node --experimental-modules "$1.mjs" # cat "$1.js" | node --input-type module
    rm "$1.mjs"
}

# Calculates project source lines of code
function sloc() {
    local a=$(wc -l "$ROOT"/{!(package-lock),''}.{json,env} 2>&1 |
        tail -1 | grep -Po '\d+')
    local b=$(wc -l "$ROOT"/{bin,src,public}/**/*.{html,css,ts,tsx,mts,mjs,webmanifest,sh,ps1} 2>&1 |
        tail -1 | grep -Po '\d+')
    local c=$(wc -l "$ROOT"/.github/**/*.yml 2>&1 |
        tail -1 | grep -Po '\d+')

    print_blue ">> PROJECT SOURCE LINE OF CODES: "
    printf "$((a + b + c))\n"
}

# Generates project backup archive
function backup() {
    local base=$(basename "$ROOT")
    local backup=~/matchmoji-$(date +%m.%d.%y).tar.gz
    XZ_OPT=-9 tar --exclude="$base"/{lib,build,node_modules,package-lock.json} \
        -Jcpf $backup -C $(dirname "$ROOT") "$base"

    print_blue ">> $(du -sh $backup)\n"
}

# Generates production ready files
function production_builder() {
    cd "$ROOT"
    rm -R "$ROOT"/lib/* &>/dev/null
    npx react-scripts build
    npx tsc --project tsconfig.lib.json
    typescript_run "$ROOT"/bin/library-builder

    # Removing SVG files and their footprint
    rm -R "$ROOT"/build/static/media/*.svg
    sed -Ei '/.svg",?$/d' "$ROOT"/build/asset-manifest.json
    sed -zi 's/,\(\n\s*}\)/\1/g' "$ROOT"/build/asset-manifest.json # Removing trailing commas
}

# Generates project required fonts
function font_generator() {
    local answer
    local temp_dir=/tmp/font_generator
    if [ -d $temp_dir ]; then
        read_blue ">> Previous build files exist, using them? (y/n) " answer
        if [[ $answer = 'n' ]]; then
            rm -R $temp_dir &>/dev/null
            mkdir -p $temp_dir
        fi
    else
        mkdir -p $temp_dir
    fi

    print_blue ">> This is a time consuming process, please be patient!\n"
    cd $temp_dir
    set -e

    # Cloning required repositories
    if [ ! -d venv ]; then
        # Installing "nanoemoji" in virtual environment
        python3 -m venv venv --system-site-packages
        source venv/bin/activate
        pip install git+https://github.com/googlefonts/nanoemoji.git
    else
        source venv/bin/activate
    fi
    if [ ! -d woff2 ]; then
        git clone --recursive https://github.com/google/woff2.git
        make -C woff2 clean all
        chmod +x woff2/woff2*
    fi
    if [ ! -d twemoji ]; then
        mkdir twemoji
        wget -qO- https://api.github.com/repos/twitter/twemoji/tarball/master |
            tar xz --strip=1 -C twemoji
    fi
    if [ ! -d noto-emoji ]; then
        mkdir noto-emoji
        wget -qO- https://api.github.com/repos/googlefonts/noto-emoji/tarball/master |
            tar xz --strip=1 -C noto-emoji
        pip install --no-cache-dir -r noto-emoji/requirements.txt
    fi

    # "glyf" table format should be used instead of
    # "cff2" because it's compress better to woff2.
    local version format name temp_name
    local font_version=$(cat $temp_dir/twemoji/package.json | grep -Po '"version": "\K.*\d')
    local splitted_version=(${font_version//./ })

    # Scaling down the font size to match with Mozilla version used in Firefox.
    # see https://github.com/mozilla/twemoji-colr
    local scale=0.833
    local width=1200
    local ascender=1200
    local descender=0
    local cx=$(( (ascender - descender) / 2 ))
    local cy=$(( width / 2 ))
    # It's not possible to change "transform-origin" attribute in here. Repositioning manually instead.
    # Same as "matrix($scale 0 0 $scale $(( (1 - $scale) * $cx )) $(( (1 - $scale) * $cy )))"
    local transform="translate($cx, $cy) scale($scale) translate(-$cx, -$cy)"

    for version in 0 1; do
        # Skip generating "COLRv1" format, because this font contains
        # no gradient and file size also will be bigger.
        # see https://github.com/googlefonts/color-fonts/issues/1
        [[ $version == 1 ]] && continue

        name="twemoji-colr$version"
        time nanoemoji --version_major ${splitted_version[0]} \
            --version_minor ${splitted_version[1]} --color_format glyf_colr_$version \
            --family 'Twitter Emoji' --output_file "$name.ttf" \
            --upem 1000 --width $width --ascender $ascender --descender $descender \
            --transform "$transform" --build_dir 'build-twemoji' \
            --exec_ninja false $(find $temp_dir/twemoji/assets/svg -name '*.svg')

        # Compressing generated font and moving it to the project
        woff2/woff2_compress build-twemoji/"$name".ttf
        mv build-twemoji/"$name".woff2 "$ROOT"/src/assets
    done

    font_version=$(cat $temp_dir/noto-emoji/NotoColorEmoji.tmpl.ttx.tmpl |
        grep -Po 'fontRevision.*"\K.*\d')
    splitted_version=(${font_version//./ })

    # "COLRv0" format maximum layers is limited to 65536 and
    # can't be used for this font.
    #
    # Flags won't look good as "CBDT/sbix" version.
    # see https://github.com/googlefonts/color-fonts/issues/27
    # see https://github.com/googlefonts/noto-emoji/pull/389#issuecomment-1134895059
    for version in 'colr1' 'sbix'; do
        name="noto-color-emoji-$version"
        temp_name="$name"
        format='glyf_colr_1'
        if [[ $version = 'sbix' ]]; then
            format='sbix'
        fi

        time nanoemoji --version_major ${splitted_version[0]} \
            --version_minor ${splitted_version[1]} --color_format $format \
            --family 'Noto Color Emoji' --output_file "$name.ttf" \
            --upem 1000 --build_dir 'build-noto' --exec_ninja false \
            $(find $temp_dir/noto-emoji/{svg,third_party/region-flags/waved-svg} -name '*.svg')

        # Adding light glow effect to flags
        if [[ $version = 'colr1' ]]; then
            cd noto-emoji # Should be inside directory because of "make" utility
            temp_name="$name-glow"
            python3 colrv1_add_soft_light_to_flags.py ../build-noto/"$name".ttf \
                ../build-noto/"$temp_name".ttf
            cd ..
        fi

        # Compressing generated font and moving it to the project
        woff2/woff2_compress build-noto/"$temp_name".ttf
        mv build-noto/"$temp_name".woff2 "$ROOT"/src/assets/"$name".woff2
    done

    set +e

    read_blue ">> Fonts generated successfully, remove temp files located at $temp_dir? (y/n) " answer
    if [[ $answer = 'y' ]]; then
        rm -R $temp_dir
    fi
}

# Parsing arguments
args_origin="$*"
args=$(getopt --options="hvtf" --longoptions="help,version,windows-terminal, \
    forward-ports,sloc,backup,production-builder,font-generator,emoji-generator" \
    --name="$NAME" -- "$@")
[ $? != 0 ] && exit 2
eval set -- "$args" # Handling quotes

app="MatchMoji v$(grep -Po '"version": "\K(.*\d)' "$ROOT"/package.json)"
help=$(cat << EOL
$app

Usage:
    $NAME [Options]...
    $NAME [Tools]...

Options:
    -h, --help                      Display this help and exit
    -v, --version                   Display application version and exit
    -t, --windows-terminal          Use external Windows Terminal (only on WSL)
    -f, --forward-ports             Accessible development environment on host's local
                                    network (only on WSL)

Tools:
    --sloc                          Calculate project source lines of code
    --backup                        Generate project backup archive
    --production-builder            Generate production ready files
    --font-generator                Generate project required fonts in WOFF2 format
    --emoji-generator               Generate project required emoji data
EOL
)

forward_ports=false
while true; do
    case "$1" in
    -h | --help ) echo "$help"; exit;;
    -v | --version ) echo "$app"; exit;;
    -t | --windows-terminal ) windows_terminal "$args_origin"; exit;;
    -f | --forward-ports ) forward_ports=true; shift;;
    --sloc ) sloc; exit;;
    --backup ) backup; exit;;
    --production-builder ) production_builder; exit;;
    --font-generator ) font_generator; exit;;
    --emoji-generator ) typescript_run "$ROOT"/bin/emoji-parser; exit;;
    -- ) shift; break;;
    * ) exit 2;;
    esac
done

# Forwarding development server's ports
if $forward_ports; then
    assert_wsl
    print_blue ">> Development environment started with forwarded ports\n"
    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden \
        -File $PORT_FORWARDER -Silent
    # Closing opened ports on Ctrl+C
    trap cleanup SIGINT
    function cleanup() {
        powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden \
            -File $PORT_FORWARDER -Close -Silent
    }
fi

# Starting development server
npm start --prefix "$ROOT"
