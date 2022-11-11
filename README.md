<div align="center" style="font-size:x-large">
  <img src="public/favicon.svg" alt="logo" width="250">
  </br>
  <!-- To avoid unnecessary redirect, trailing slash shouldn't be removed. -->
  <a href="https://soberia.github.io/matchmoji/">&lt; D E M O &gt;</a>
</div>

# 🖥️ **Run on Local Machine**

```bash
git clone --depth 1 https://github.com/Soberia/matchmoji.git
npm install --prefix matchmoji
npm start --prefix matchmoji
```

# 🔌 **Installation**

Register the NPM package registry:

> If you're using any shell other than `bash`, replace `$'\u0067` with `'g` in the last line.

```bash
npm config set --location=project \
  @soberia:registry=https://npm.pkg.github.com \
  //npm.pkg.github.com:_authToken=$'\u0067hp_EEWCmZStsbTAK9Cwymo8YfbnVGhphp0rdyBI'
```

Install the package:

```bash
npm install @soberia/matchmoji
```

# 📋 **How to Use**

This project is created with help of [Create React App](https://github.com/facebook/create-react-app) and assumes you're also bootstrapping your project with it. If not, you need a bundler like [Webpack](https://github.com/webpack/webpack) to handle assets imports for `.css`, `.json`, `.svg`, `.woff2` and `.m4a` file extensions.

After you installed the package, you need to put the required static files into your project.
The path of static files must be the same as `path` prop value. For example, if you want to serve `MatchMoji` on `yourdomain.com/game`, then you must also place the static files in `/game`.  
You can leverage the `matchmoji-generate` utility to generate the required static files by specifying where to store them:

```bash
npx matchmoji-generate ./public/game
```

Now you can import `MatchMoji` component and use it in your project. It's better to [lazy load](https://reactjs.org/docs/code-splitting.html#code-splitting) the `MatchMoji` component to reduce the load time of your app. In this case, you can replace the `import` statement with `@soberia/matchmoji/lazy` or create your own lazy loaded component with your custom logic instead. However, if you aren't using CRA, you need Webpack again to do the code splitting for you.

```jsx
import MatchMoji from '@soberia/matchmoji';
import {useState} from 'react';

function App() {
  const [path, setPath] = useState('/home');
  const [theme, setTheme] = useState('light');
  const isLight = theme === 'light';

  return (
    <div className={isLight ? 'light-theme' : 'dark-theme'}>
      {path === '/home' ? (
        <div onClick={() => setPath('/game')}>Open Game</div>
      ) : (
        <MatchMoji
          path="/game"
          theme={{
            // Passing the app's theme to the component.
            // By this way app's theme also changes whenever
            // `MatchMoji`'s theme changes or vice versa.
            isLight,
            handler: () => setTheme(isLight ? 'dark' : 'light')
          }}
          exitHandler={
            // Going back to homepage on exit
            () => setPath('/home')
          }
        />
      )}
    </div>
  );
}
```

One of the generated static files is `service-worker.js`. This file is required for `MatchMoji` to work offline.
For the last step, after building your project with `npm run build` command you have to replace JavaScript and CSS file names in this file (i.e. `main.js` and `main.css`) with your generated build files which contain hashes in their names. You can do it manually or with a simple `bash` script like this: (Don't forget to modify the service worker's path based on where it's located)

```bash
for extension in "css" "js"; do
  for file in build/static/$extension/*.$extension; do
    file=$(basename $file)
    if [[ $file == main* ]]; then
      sed -i "s/main.$extension/$file/" build/game/service-worker.js
    elif [[ $file == *chunk* ]]; then
      # Adding lazy loaded chunks
      sed -i "s/$extension'},/&{revision:null,url:'\/static\/$extension\/$file'},/" \
        build/game/service-worker.js
    fi
  done
done
```

# 🔧 **Props**

- **`path`: `string`**  
  The path which `MatchMoji` will be served on. This path also must point to the location of required static files. If not provided, `/` will be considered as the default path.

- **`theme`: `{isLight: boolean; handler: () => void}`**  
  Your app's current theme. `MatchMoji` manages its theme state independently, so to keep it in sync with your app's theme you can specify your app's current theme with an `object` that contains `isLight` property as theme mode and `handler` as a callback function which runs whenever `MatchMoji`'s theme got changed.

- **`exitHandler`: `() => void`**  
  A callback function runs whenever `MatchMoji` gets unmounted. You can use this to handle the page navigation.

# 🔨 **Development**

If you're using [VSCode](https://github.com/microsoft/vscode) you can open the workspace file `.vscode/matchmoji.code-workspace` and use these tools from VSCode Tasks.

### **Generate Project Required Fonts**

This will generate `Noto Emoji` and `Twemoji` fonts in `COLRv0`, `COLRv1` and `sbix` formats in `WOFF2` container:

```bash
bin/main.sh --font-generator
```

### **Generate Project Required Emoji Data**

This will generate a `JSON` file of Unicode Emoji ranges:

```bash
bin/main.sh --emoji-generator
```

For more information about parameters, you can try this:

```bash
bin/main.sh --help
```
