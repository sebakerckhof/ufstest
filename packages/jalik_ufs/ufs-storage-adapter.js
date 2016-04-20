const optionsSchema = new SimpleSchema({
  name:{
    type:String,
    optional:true
  },
  transformRead: {
    type: Function,
    optional: true
  },
  transformWrite: {
    type: Function,
    optional: true
  },
});

/**
 * File store
 * @param options
 * @constructor
 */
class StorageAdapter{
  
  constructor(options = {}){

    // Set default options
    options = Object.assign({
      transformRead: null,
      transformWrite: null
    }, options);

    optionsSchema.clean(options);
    check(options,optionsSchema);

    Object.assign(this,options);
  }
  
  /**
   * Transforms the file on reading
   * @param readStream
   * @param writeStream
   * @param fileId
   * @param file
   * @param request
   * @param headers
   */
  transformRead(readStream, writeStream, fileId, file, request, headers) {
    readStream.pipe(writeStream);
  };

  /**
   * Transforms the file on writing
   * @param readStream
   * @param writeStream
   * @param fileId
   * @param file
   */
  transformWrite(readStream, writeStream, fileId, file) {
    readStream.pipe(writeStream);
  };

  /**
   * Writes the file to the store
   * @param rs
   * @param fileId
   * @param callback
   */
  write(rs, fileId, callback) {
    const file = this.collection.findOne(fileId);
    const ws = this.getWriteStream(fileId, file);

    const errorHandler = Meteor.bindEnvironment(function (err) {
      this.onWriteError.call(this, err, fileId, file);
      callback.call(this, err);
    });

    ws.on('error', errorHandler);
    ws.on('finish', Meteor.bindEnvironment(function () {
      var size = 0;
      const readStream = this.getReadStream(fileId, file);

      readStream.on('error', Meteor.bindEnvironment(function (error) {
        callback.call(this, error, null);
      }));

      readStream.on('data', Meteor.bindEnvironment(function (data) {
        size += data.length;
      }));

      readStream.on('end', Meteor.bindEnvironment(function () {
        // Set file attribute
        file.complete = true;
        file.progress = 1;
        file.size = size;
        file.token = UploadFS.generateToken();
        file.uploading = false;
        file.uploadedAt = new Date();
        file.url = this.getFileURL(fileId);

        // Sets the file URL when file transfer is complete,
        // this way, the image will loads entirely.
        this.collection.update(fileId, {
          $set: {
            complete: file.complete,
            progress: file.progress,
            size: file.size,
            token: file.token,
            uploading: file.uploading,
            uploadedAt: file.uploadedAt,
            url: file.url
          }
        });

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
    this.transformWrite(rs, ws, fileId, file);
  };

  /**
   * Deletes a file async
   * @param fileId
   * @param callback
   */
  delete(fileId, callback){
    throw new Error('delete is not implemented');
  };

  /**
   * Returns the file read stream
   * @param fileId
   * @param file
   */
  getReadStream(fileId, file){
    throw new Error('getReadStream is not implemented');
  };

  /**
   * Returns the file write stream
   * @param fileId
   * @param file
   */
  getWriteStream(fileId, file){
    throw new Error('getWriteStream is not implemented');
  };


}

UploadFS.StorageAdapter = StorageAdapter;