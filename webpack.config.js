const webpack = require("webpack");
const path = require("path");
const srcDir = path.join(__dirname, "src");

module.exports = {
  entry: {
    popup: path.join(srcDir, "popup.ts"),
    msTeams: path.join(srcDir, "msTeams.ts"),
    tokenStore: path.join(srcDir, "tokenStore.ts"),
    background: path.join(srcDir, "background.ts"),
    types: path.join(srcDir, "types.ts"),
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js",
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
  resolve: {
    fallback: {
      buffer: require.resolve("buffer/"),
    },
  },
  optimization: {
    splitChunks: {
      name: "vendor",
      chunks(chunk) {
        return chunk.name !== "background";
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  mode: "production",
};
