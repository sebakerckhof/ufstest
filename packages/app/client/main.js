angular
  .module('ufstest',['angular-meteor'])
  .controller('ufsUploadsCtrl', ufsUploadsCtrl)
  .controller('ufsUploadCtrl', ufsUploadCtrl)
  .directive('ufsUploads', ufsUploads)
  .directive('ufsUpload', ufsUpload)
    .filter('size', () => SizeFilter);


function SizeFilter(bytes) {
    if (bytes >= 1000000000) {
        return Math.round(bytes / 1000000000) + ' GB';
    }
    if (bytes >= 1000000) {
        return Math.round(bytes / 1000000) + ' MB';
    }
    if (bytes >= 1000) {
        return Math.round(bytes / 1000) + ' KB';
    }
    return bytes + ' B';
}

function ufsUploads() {
    return {
        restrict: 'E',
        controller: 'ufsUploadsCtrl',
        controllerAs: 'vm',
        scope:{},
        bindToController:{},
        templateUrl: '/packages/app/client/uploads.html'
    };
}

function ufsUpload() {
    return {
        restrict: 'E',
        controller: 'ufsUploadCtrl',
        controllerAs: 'vm',
        replace:true,
        scope:{},
        bindToController:{
            file: '='
        },
        templateUrl: '/packages/app/client/upload.html'
    };
}

const workers = [];

ufsUploadsCtrl.$inject = [
    '$scope',
    '$reactive',
];
function ufsUploadsCtrl($scope, $reactive) {
    $reactive(this).attach($scope);

    this.helpers({
        files: () => Images.find({}, {sort: {createdAt: 1, name: 1}})
    });

    this.upload = () => {
        const callback = (ev) => {
            UploadFS.readAsArrayBuffer(ev, (data, file) => {
                debugger;
                var uploader = new UploadFS.Uploader({
                    data: data,
                    file: file,
                    store: 'files'
                });

                // Remove uploader on complete
                uploader.onComplete =  () => {
                    delete workers[file.name];
                };

                // Remember uploader
                this.autorun(() => {
                    uploader.progress;
                    if (uploader.file._id) {
                        workers[uploader.file._id] = uploader;
                    }
                });

                uploader.start();
            });
        };

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = callback;
        input.click();
    }


    this.subscribe('files');
};

ufsUploadCtrl.$inject = [
    '$scope',
    '$reactive',
];
function ufsUploadCtrl($scope, $reactive) {
    $reactive(this).attach($scope);

    this.delete = () => {
        Images.remove(this._id);
    };

    this.abort = () => {
        workers[this._id].abort();
    };

    this.start = () => {
        workers[this._id].start();
    };

    this.pause = () => {
        workers[this._id].stop();
    };

};

function onReady() {
    angular.bootstrap(document, [
        'ufstest'
    ], {
        strictDi: true
    });
}

if (Meteor.isCordova) {
    angular.element(document).on('deviceready', onReady);
} else {
    angular.element(document).ready(onReady);
}