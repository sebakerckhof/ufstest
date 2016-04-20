if (Meteor.isServer) {
  var WABS = Npm.require('azure-storage');
}


/**
 * WABS store
 * @param options
 * @constructor
 */
class WABSStorageAdapter extends UploadFS.StorageAdapter{
  constructor(options){
    super(options);

    this.folder = options.folder;
    if (typeof this.folder === "string" && this.folder.length) {
      if (this.folder.slice(0, 1) === "/") {
        this.folder = this.folder.slice(1);
      }
      if (this.folder.slice(-1) !== "/") {
        this.folder += "/";
      }
    } else {
      this.folder = "";
    }

    this.container = options.container;

    if (!this.container){
      throw new Error('UploadFS.store.WABS you must specify the "container" option');
    }

    // Create WABS service
    if(options.storageConnectionString){
      this.WABSBlobService = WABS.createBlobService(options.storageConnectionString);
    }else if(options.storageAccount && options.storageAccessKey){
      this.WABSBlobService = WABS.createBlobService(options.storageAccount,options.storageAccessKey);
    }else{
      this.WABSBlobService = WABS.createBlobService();
    }

    //XXX: Is this necessary?
    this.WABSBlobService.createContainerIfNotExists(this.container,function(){});

  }

  /**
   * Removes the file
   * @param fileId
   * @param callback
   */
  delete(fileId, callback){
    if (typeof callback !== 'function') {
      callback = function (err) {
        err && console.error(`ufs: cannot delete file "${ fileId }" at ${ path } (${ err.message })`);
      }
    }

    this.WABSBlobService.deleteBlob(this.container, this.folder + fileId, function(error) {
      callback(error, !error);
    });
  }

  /**
   * Returns the file read stream
   * @param fileId
   * @return {*}
   */
  getReadStream(fileId){
    return this.WABSBlobService.createReadStream(this.container,this.folder + fileId);
  }

  /**
   * Returns the file write stream
   * @param fileId
   * @return {*}
   */
  getWriteStream(fileId, file) {
    const writeStream = this.WABSBlobService.createWriteStreamToBlockBlob(this.container, this.folder + fileId);

    // The filesystem does not emit the "end" event only close - so we
    // manually send the end event
    writeStream.on('close', () => {

      this.WABSBlobService.getBlobProperties(this.container, this.folder + fileId, (error, properties) => {
        if (error) {
          writeStream.emit('error', error);
        } else {
          // Emit end and return the fileId, size, and updated date
          writeStream.emit('stored', {
            fileId: fileId,
            size: properties.contentLength,
            storedAt: new Date()
          });
        }
      });
    });

    return writeStream;
  }
}

UploadFS.WABStorageAdapter = WABSStorageAdapter;