module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.output.publicPath = '/';
      
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        minimize: process.env.NODE_ENV === 'production',
      };
      
      if (webpackConfig.optimization.splitChunks) {
        webpackConfig.optimization.splitChunks = {
          ...webpackConfig.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        };
      }
      
      return webpackConfig;
    },
  },
  style: {
    postcss: {
      mode: 'file',
    },
  },
}



