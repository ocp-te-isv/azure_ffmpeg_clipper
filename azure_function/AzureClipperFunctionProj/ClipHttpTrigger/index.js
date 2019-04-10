// https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node
// required to start the ffmpeg process in the container
// we could also import the app insights module to log direct to app insights
// https://docs.microsoft.com/en-us/azure/azure-functions/functions-monitoring#custom-metrics-logging-1
var spawn = require('child_process').spawn;
var fs = require('fs');

module.exports = async function (context, req) {
    return new Promise((resolve, reject) => {
        var start = new Date();        
        context.log('clipper_func, trace, JavaScript HTTP trigger function processed a request.');
        context.log('clipper_func, trace, spawning ffmpeg process ' + start.toTimeString());
        const fileName = req.query.fileName;
        if (req.query.startTime || (req.body && req.body.startTime)) {
            var ffmpegJob = spawn('ffmpeg', ['-v', 'quiet', '-ss', req.query.startTime, '-i', req.query.sourceUrl, '-t', req.query.duration, '-c', 'copy', fileName]);
            ffmpegJob.on('exit', function (ffmpegOut) {
                context.log('clipper_func, trace, ffmpeg done : ' + ffmpegOut);

                // check that we output the desired file from Ffmpeg and put into
                // function's output binding for the blob Storage
                if (fs.existsSync("./" + fileName)) {
                    context.log("fileSize, " + fileName + ", " + getFilesize("./" + fileName));
                    context.bindings.myOutputBlob = fs.readFileSync("./" + fileName);
                    context.res = {
                        status: 200,
                        body: "Should have output blob to file " + fileName
                    }
                    context.log("clipper_func, execution_time_success, " + (new Date() - start));
                    resolve();
                }
                else {
                    context.log("did not find " + fileName);
                    context.res = {
                        status: 404,
                        body: "Failed to find file " + fileName
                    }
                    context.log("clipper_func, execution_time_failure, " + (new Date() - start));
                    reject("did not find file to upload");
                }
            })

            ffmpegJob.on('error', function (ffmpegOut) {
                context.log('clipper_func, trace, ffmpeg error : ' + ffmpegOut);
                context.res = {
                    status: 500, /* Defaults to 200 */
                    body: "params were " + (req.query.startTime || req.body.startTime)
                        + "\n" + (req.query.sourceUrl || req.body.sourceUrl)
                        + "\n" + (req.query.duration || req.body.duration)
                        + "\n" + (req.query.fileName || req.body.fileName)
                };
                context.log("clipper_func, execution_time_ffmpegerror, " + (new Date() - start));
                reject('ffmpeg error : ' + ffmpegOut);
            })
        }
        else {
            context.res = {
                status: 400,
                body: "clipper_func, Please pass correct params to function"
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