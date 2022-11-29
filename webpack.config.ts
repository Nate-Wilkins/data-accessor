const path = require("path");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const { DefinePlugin, NoEmitOnErrorsPlugin } = require("webpack");

// NODE_ENV: 'development' | 'production'
const NODE_ENV =
  process.env.NODE_ENV !== "production" ? "development" : "production";

module.exports = {
  target: "web",

  entry: "./src/index.tsx",

  output: {
    pathinfo: true,
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    filename: "index.js",
    libraryTarget: 'commonjs2'
  },

  plugins: [
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
    }),
    new DefinePlugin({
      NODE_ENV: JSON.stringify(NODE_ENV),
    }),
    new NoEmitOnErrorsPlugin(),
  ],

  cache: {
    type: "filesystem",
    allowCollectingMemory: true,
  },

  optimization: {
    minimize: true,
    concatenateModules: true,
    removeAvailableModules: false,
    removeEmptyChunks: false,
    moduleIds: "named",
  },

  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        include: [path.join(__dirname, "src"), path.join(__dirname, "test")],
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              // Include type definition files.
              transpileOnly: false,
            },
          },
        ],
      },
      {
        enforce: "pre",
        test: /\.(js|ts|tsx)$/,
        loader: "source-map-loader",
      },
    ],
  },

  mode: NODE_ENV,
  devtool: NODE_ENV === "development" ? "inline-source-map" : "source-map",

  node: {
    __filename: true,
    __dirname: false,
  },

  resolve: {
    modules: [path.resolve(__dirname, "node_modules"), "node_modules"],
    extensions: [".ts", ".tsx", ".js", ".json"],
    fallback: {
      path: require.resolve("path-browserify"),
    },
  },
};

