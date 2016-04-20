Package.describe({
    name: 'jalik:ufs',
    version: '0.6.0',
    author: 'karl.stein.pro@gmail.com',
    summary: 'Base package for UploadFS',
    homepage: 'https://github.com/jalik/jalik-ufs',
    git: 'https://github.com/jalik/jalik-ufs.git',
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.3.1');
    api.use('check');
    api.use('matb33:collection-hooks@0.7.13');
    api.use('mongo');
    api.use('reactive-var', 'client');
    api.use('underscore');
    api.use('ecmascript');
    api.use('aldeed:simple-schema@1.5.3');
    api.use('webapp', 'server');

    api.addFiles([
        'ufs.js',
        'ufs-config.js'
    ],['client','server']);
    api.addFiles([
        'ufs-uploader.js'

    ],['client']);
    api.addFiles([
        'ufs-filter.js',
        'ufs-store.js',
        'ufs-storage-adapter.js',
        'ufs-methods.js',
        'ufs-server.js'
    ],['server']);


    api.export('UploadFS');
});

Npm.depends({
    mkdirp: '0.3.5'
});