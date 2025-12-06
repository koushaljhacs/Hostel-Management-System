const path = require('path');
const glob = require('glob');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const normalizeEntryName = (relativePath) => relativePath.split(path.sep).join('/');

const buildEntries = () => {
    const entries = {};

    glob.sync('./web-interfaces/**/*.js', { nodir: true }).forEach((file) => {
        const relative = normalizeEntryName(path.relative('./web-interfaces', file).replace(/\.js$/, ''));
        entries[`web-interfaces/${relative}`] = path.resolve(file);
    });

    glob.sync('./hostel-booking/client/**/*.jsx', { nodir: true }).forEach((file) => {
        const relative = normalizeEntryName(path.relative('./hostel-booking/client', file).replace(/\.jsx$/, ''));
        entries[`hostel-booking/${relative}`] = path.resolve(file);
    });

    glob.sync('./web-interfaces/**/*.css', { nodir: true }).forEach((file) => {
        const relative = normalizeEntryName(path.relative('./web-interfaces', file).replace(/\.css$/, ''));
        entries[`styles/${relative}`] = path.resolve(file);
    });

    glob.sync('./hostel-booking/client/**/*.css', { nodir: true }).forEach((file) => {
        const relative = normalizeEntryName(path.relative('./hostel-booking/client', file).replace(/\.css$/, ''));
        entries[`hostel-booking/styles/${relative}`] = path.resolve(file);
    });

    return entries;
};

module.exports = {
    mode: 'production',
    entry: buildEntries(),
    output: {
        path: path.resolve(__dirname, 'dist/assets'),
        filename: '[name].js',
        clean: true
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', { targets: '>0.25%, not dead' }],
                            ['@babel/preset-react', { runtime: 'classic' }]
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css'
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, '../web-interfaces'),
                    to: path.resolve(__dirname, 'dist/web-interfaces'),
                    globOptions: {
                        ignore: ['**/*.js', '**/*.jsx', '**/*.css']
                    }
                },
                {
                    from: path.resolve(__dirname, '../hostel-booking/client'),
                    to: path.resolve(__dirname, 'dist/hostel-booking/client'),
                    globOptions: {
                        ignore: ['**/*.js', '**/*.jsx', '**/*.css']
                    }
                },
                {
                    from: path.resolve(__dirname, 'security-headers.json'),
                    to: path.resolve(__dirname, 'dist/security-headers.json')
                }
            ]
        })
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    format: {
                        comments: false
                    }
                }
            }),
            new CssMinimizerPlugin(),
            new ImageMinimizerPlugin({
                minimizer: {
                    implementation: ImageMinimizerPlugin.imageminMinify,
                    options: {
                        plugins: [
                            ['mozjpeg', { quality: 70 }],
                            ['pngquant', { quality: [0.6, 0.8] }]
                        ]
                    }
                }
            })
        ]
    }
};

