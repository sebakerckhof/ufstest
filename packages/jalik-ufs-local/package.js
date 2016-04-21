Package.describe({
    name: 'jalik:ufs-local',
    version: '0.2.5',
    author: 'karl.stein.pro@gmail.com',
    summary: 'File system based store for UploadFS',
    homepage: 'https://github.com/jalik/jalik-ufs-local',
    git: 'https://github.com/jalik/jalik-ufs-local.git',
    documentation: 'README.md',
    license: 'MIT'
});

Package.onUse(function (api) {
    api.versionsFrom('1.2.1');
    api.use('check');
    api.use('jalik:ufs@0.6.0');
    api.use('underscore');
    api.use('ecmascript');
    api.use('aldeed:simple-schema@1.5.3');

    api.addFiles('ufs-local.js',['server']);
});

Npm.depends({
    mkdirp: '0.3.5'
});
