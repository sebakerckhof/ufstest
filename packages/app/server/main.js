


const store = new UploadFS.Store({
    name:'files',
    collection:Images,
    filters:[
        new UploadFS.ExtensionsFilter(['jpg','png','bmp'])
    ],
    storage:[
        new UploadFS.WABStorageAdapter({
            name:'original',
            container:'origi'
        }),
        new UploadFS.LocalStorageAdapter({
            name:'thumbnails',
            transformWrite: function (from, to, fileId, file) {
                // Resize images
                if (file.type.indexOf('image/') === 0) {
                    var gm = Npm.require('gm');
                    if (gm) {
                        gm(from)
                            .resize(64, 64)
                            .gravity('Center')
                            .extent(64, 64)
                            .quality(75)
                            .stream().pipe(to);
                    } else {
                        from.pipe(to);
                    }
                } else {
                    from.pipe(to);
                }
            },
        })
    ]
});


Meteor.publish('files',function(){
    return Images.find({});
});

Meteor.startup(() => {
  // code to run on server at startup
});
