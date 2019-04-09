FROM mcr.microsoft.com/azure-functions/node:2.0

ENV AzureWebJobsScriptRoot=/home/site/wwwroot

RUN apt-get update 
RUN apt-get install -y ffmpeg

COPY . /home/site/wwwroot
