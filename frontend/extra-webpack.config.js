module.exports = {
  module: {
    rules: [
      {
        test: /nsfwjs[\\/]dist[\\/]models[\\/].*\.min\.js$/,
        use: 'null-loader'
      }
    ]
  }
};
