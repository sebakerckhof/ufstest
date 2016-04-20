const fs = Npm.require('fs');

const optionsSchema = new SimpleSchema({
    name: {
        type: String,
    },
    collection: {
        type: Mongo.Collection
    },
    filters: {
        type: Array,
        optional:true,
        autoValue:function(){
            if(!this.isSet){
                return [];
            }
        }
    },
    "filters.$":{
        type:UploadFS.Filter,
    },
    "storage":{
        type:Array,
    },
    "storage.$":{
        type:UploadFS.StorageAdapter
    }
});

/**
 * File store
 * @param options
 * @constructor
 */
class Store{
    constructor(options = {}){
        // Set default options
        options = Object.assign({
            collection: null,
            filter: null,
            name: null,
            onCopyError: null,
            onFinishUpload: null,
            onRead: null,
            onReadError: null,
            onWriteError: null,
            transformRead: null,
            transformWrite: null
        }, options);

        optionsSchema.clean(options);
        check(options,optionsSchema);
        
        Object.keys(options).forEach(key => {
            this[`_${key}`] = options[key];
        });

        UploadFS.addStore(this);

        // Code executed before inserting file
        this.collection.before.insert((userId, file) => {
            console.log(file);
            if (typeof file.name !== 'string' || !file.name.length) {
                throw new Meteor.Error(400, "file name not defined");
            }
            if (typeof file.store !== 'string' || !file.store.length) {
                throw new Meteor.Error(400, "file store not defined");
            }
            if (typeof file.complete !== 'boolean') {
                file.complete = false;
            }
            if (typeof file.uploading !== 'boolean') {
                file.uploading = true;
            }
            file.extension = file.name && file.name.substr((~-file.name.lastIndexOf('.') >>> 0) + 2).toLowerCase();
            file.progress = parseFloat(file.progress) || 0;
            file.size = parseInt(file.size) || 0;
            file.userId = file.userId || userId;
            file.versions = {};

            this.storage.forEach(storage => {
                file.versions[storage.name] = {
                    processing:false,
                    stored:false
                }
            });
        });

        // Code executed before removing file
        this.collection.before.remove((userId, file) => {
          this.remove(file);
        });

        this.collection.deny({
            // Test filter on file insertion
            insert: (userId, file) => {
                this.filters.forEach(filter => {
                    filter.check(file);
                });
            }
        });
    }

    remove(file){
        // Delete the physical file in the storages
        this.storage.forEach(storage => {
            if(file.versions.hasOwnProperty(storage.name) && file.versions[storage.name].stored){
                storage.delete(file);
            }
        });

        const tmpFile = UploadFS.getTempFilePath(file._id);

        // Delete the temp file
        fs.stat(tmpFile, (err) => {
            !err && fs.unlink(tmpFile,(err) =>  {
                err && console.error(`ufs: cannot delete temp file at ${ tmpFile } (${ err.message })`);
            });
        });
    }

    /**
     * Creates the file in the collection
     * @param file
     * @return {string}
     */
    create(file){
        check(file, Object);
        file.store = this.name;
        return this.collection.insert(file);
    }

    /**
     * Returns the collection
     * @return {Mongo.Collection}
     */
    get collection() {
        return this._collection
    }

    /**
     * Returns the file filter
     * @return {UploadFS.Filter}
     */
    get storage() {
        return this._storage;
    }

    getVersion(name){
        return this.storage.find(storage => storage.name === name);
    }

    /**
     * Returns the file filter
     * @return {UploadFS.Filter}
     */
    get filters() {
        return this._filters;
    }

    /**
     * Returns the store name
     * @return {string}
     */
    get name() {
        return this._name;
    }

    /**
     * Returns the file URL
     * @param fileId
     */
    getFileURL(fileId,version) {
        var file = this.collection.findOne(fileId, {
            fields: {name: 1}
        });
        return file && `${ this.getURL() }/${ version }/${ fileId }/${encodeURIComponent(file.name)}`;
    }

    /**
     * Returns the store URL
     */
    getURL() {
        return Meteor.absoluteUrl(UploadFS.config.storesPath + '/' + this.name, {
            secure: UploadFS.config.https
        });
    }

    /**
     * Writes the file to the store
     * @param rs
     * @param fileId
     * @param callback
     */
    write(rs, fileId, callback) {
        const file = this.collection.findOne(fileId);

        const promises = [];

        const errorHandler = Meteor.bindEnvironment(err => {
            this.collection.remove(fileId);
            this.onWriteError.call(this, err, fileId, file);
            callback.call(this, err);
        });

        this._storage.forEach(storage => {
            const ws = storage.getWriteStream(fileId,file);

            const update = {$set:{}};
            update.$set[`versions.${storage.name}`] = {
                processing:true
            };
            this.collection.update(fileId, update);

            ws.on('error', errorHandler);
            ws.on('finish', Meteor.bindEnvironment(() => {
                let size = 0;
                const readStream = storage.getReadStream(fileId, file);

                readStream.on('error', Meteor.bindEnvironment((error) => {
                    callback.call(this, error, null);
                }));
                
                readStream.on('data', Meteor.bindEnvironment(data => {
                    size += data.length;
                }));
                
                readStream.on('end', Meteor.bindEnvironment(() => {

                    update.$set[`versions.${storage.name}`] = {
                        size: size,
                        stored: true,
                        processing:false,
                        url : this.getFileURL(fileId,storage.name)
                    };
                    
                    this.collection.update(fileId, update);


                    // Return file info
                    callback.call(this, null, file);

                    // Execute callback
                    if (typeof this.onFinishUpload == 'function') {
                        this.onFinishUpload.call(this, file);
                    }

                    // Simulate write speed
                    if (UploadFS.config.simulateWriteDelay) {
                        Meteor._sleepForMs(UploadFS.config.simulateWriteDelay);
                    }

                }));
            }));
            // Execute transformation
            storage.transformWrite(rs, ws, fileId, file);
        });
    }

    /**
     * Called when a file has been uploaded
     * @param file
     */
    onFinishUpload(file){}

    /**
     * Called when a file is read from the store
     * @param fileId
     * @param file
     * @param request
     * @param response
     * @return boolean
     */
    onRead(fileId, file, request, response){
        return true;
    }

    /**
     * Callback for read errors
     * @param err
     * @param fileId
     * @param file
     * @return boolean
     */
    onReadError(err, fileId, file) {
        console.error(`ufs: cannot read file "${ fileId }" (${ err.message })`);
    }

    /**
     * Callback for write errors
     * @param err
     * @param fileId
     * @param file
     * @return boolean
     */
    onWriteError(err, fileId, file) {
        console.error(`ufs: cannot write file "${ fileId }" (${ err.message })`);
    }
}

UploadFS.Store = Store;