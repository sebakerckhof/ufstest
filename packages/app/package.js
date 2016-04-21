Package.describe({
    name: 'app',
    version: '0.1.0',
    author: 'seba.kerckhof@gmail.com',
    summary: 'test',
    git: 'https://github.com/sebakerckhof/ufstest',
    documentation: 'README.md',
    license: 'MIT'
});

Package.onUse(function (api) {
    api.versionsFrom('1.3.2');
    api.use('check');
    api.use('underscore');
    api.use('mongo');
    api.use('angular@1.3.10');
    api.use('jalik:ufs@0.6.0');
    api.use('jalik:ufs-template-helpers@0.6.0');
    api.use('seba:ufs-wabs@0.1.0');
    api.use('jalik:ufs-local@0.2.5');

    api.addFiles(['shared/collections.js'],['client','server']);
    api.addFiles(['server/main.js'],['server']);
    api.addFiles([
       'client/main.js',
       'client/main.css',
       'client/main.html',
       'client/upload.html',
       'client/uploads.html'
    ],['client']);
});

Npm.depends({
    'gm': "1.22.0"
});


Package.onTest(function (api) {});