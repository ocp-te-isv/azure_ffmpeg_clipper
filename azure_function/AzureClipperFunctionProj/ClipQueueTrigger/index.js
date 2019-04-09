// https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node
// required to start the ffmpeg process in the container
// we could also import the app insights module to log direct to app insights
// https://docs.microsoft.com/en-us/azure/azure-functions/functions-monitoring#custom-metrics-logging-1
var spawn = require('child_process').spawn;
var fs = require('fs');

module.exports = async function (context, myQueueItem) {
    context.log('clipper_func, trace, JavaScript queue trigger function processed work item', myQueueItem);
    return new Promise((resolve, reject) => {
        var start = new Date();        
        const fileName = myQueueItem.fileName;
        context.log('clipper_func, trace, spawning_ffmpeg ' + fileName + start.toTimeString());
        if (myQueueItem.startTime && myQueueItem.fileName && myQueueItem.duration && myQueueItem.sourceUrl) {
            var ffmpegJob = spawn('ffmpeg', ['-v', 'quiet', '-ss', myQueueItem.startTime, '-i', myQueueItem.sourceUrl, '-t', myQueueItem.duration, '-c', 'copy', fileName]);
            
            ffmpegJob.on('exit', function (ffmpegOut) {
                context.log('clipper_func, trace, ffmpeg done : ' + ffmpegOut);

                // check that we output the desired file from Ffmpeg and put into
                // function's output binding for the blob Storage
                if (fs.existsSync('./' + fileName)) {
                    context.log('clipper_func, fileSize, ' + fileName + ', ' + getFilesize('./' + fileName));
                    context.bindings.myOutputBlob = fs.readFileSync('./' + fileName);
                    context.bindings.myOutputQueue = {
                        status: 200,
                        body: 'Should have output blob to file ' + fileName
                    }
                    context.log('clipper_func, execution_time_success : ' + (new Date() - start));
                    resolve();
                }
                else {
                    context.log('did not find ' + fileName);
                    context.bindings.myOutputQueue = {
                        status: 404,
                        body: 'Failed to find file ' + fileName
                    }
                    context.log('clipper_func, execution_time_failure, ' (new Date() - start));
                    reject('did not find file to upload');
                }
            })

            ffmpegJob.on('error', function (ffmpegOut) {
                context.log('clipper_func, trace, ffmpeg error : ' + ffmpegOut);
                context.bindings.myOutputQueue = {
                    status: 500, /* Defaults to 200 */
                    body: 'params were ' + (myQueueItem.startTime)
                        + '\n' + (myQueueItem.sourceUrl)
                        + '\n' + (myQueueItem.duration)
                        + '\n' + (myQueueItem.fileName)
                };
                context.log('clipper_func, execution_time_ffmpegerror, ' + (new Date() - start));
                reject('ffmpeg error : ' + ffmpegOut);
            })
        }
        else {
            context.bindings.myOutputQueue = {
                status: 400,
                body: 'Please pass correct params to function \n '
                +'params were ' + (myQueueItem.startTime)
                + '\n' + (myQueueItem.sourceUrl)
                + '\n' + (myQueueItem.duration)
                + '\n' + (myQueueItem.fileName)
            };
            reject();
        }
    });   
};

function getFilesize(filename) {
    const stats = fs.statSync(filename);
    const fileSize = stats.size;
    return fileSize / 1000000.0;
}