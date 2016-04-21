const fs = Npm.require('fs');
const mkdirp = Npm.require('mkdirp');

const optionsSchema = new SimpleSchema({
    mode: {
        type: String,
        optional: true,
        defaultValue: '0744'
    },
    path: {
        type: String,
        defaultValue: 'ufs/uploads'
    },
    writeMode: {
        type: String,
        optional: true,
        defaultValue: '0744'
    }
});

/**
 * WABS store
 * @param options
 * @constructor
 */
class LocalStorageAdapter extends UploadFS.StorageAdapter{
    constructor(options){
        super(options);

        if(!options.path){
            options.path = `ufs/uploads/${this.name}`;
        }

        optionsSchema.clean(options);
        check(options,optionsSchema);

        // Private attributes
        Object.assign(this,options);

        
        fs.stat(this.path, err => {
            if (err) {
                // Create the directory
                mkdirp(this.path, {mode: this.mode},  err => {
                    if (err) {
                        console.error(`ufs: cannot create store at ${ this.path } (${ err.message })`);
                    } else {
                        console.info(`ufs: store created at ${ this.path }`);
                    }
                });
            } else {
                // Set directory permissions
                fs.chmod(this.path, mode,  err => {
                    err && console.error(`ufs: cannot set store permissions ${ this.mode } (${ err.message })`);
                });
            }
        });
    }


    /**
     * Returns the file path
     * @param fileId
     * @param file
     * @return {string}
     */
    getFilePath(fileId, file) {
        return file && this.getPath(fileId + (file.extension ? '.' + file.extension : ''));
    }

    /**
     * Returns the path or sub path
     * @param file
     * @return {string}
     */
    getPath(file){
        return this.path + (file ? '/' + file : '');
    }
    
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */
    delete(fileId, file, callback) {
        const path = this.getFilePath(fileId, file);

        if (typeof callback !== 'function') {
            callback = (err) => {
                err && console.error(`fs: cannot delete file "${ fileId }" at ${path} (${ err.message })`);
            }
        }
        fs.stat(path, Meteor.bindEnvironment(function (err, stat) {
            if (!err && stat && stat.isFile()) {
                fs.unlink(path, Meteor.bindEnvironment(callback));
            }
        }));
    }

    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @return {*}
     */
    getReadStream(fileId, file) {
        return fs.createReadStream(this.getFilePath(fileId, file), {
            flags: 'r',
            encoding: null,
            autoClose: true
        });
    }

    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @return {*}
     */
    getWriteStream(fileId, file) {
        return fs.createWriteStream(this.getFilePath(fileId, file), {
            flags: 'a',
            encoding: null,
            mode: this.writeMode
        });
    }
}

UploadFS.LocalStorageAdapter = LocalStorageAdapter;