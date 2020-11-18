#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const argv = require('minimist')(process.argv.slice(2))
const FormData = require('form-data')
const JSZip =  require('jszip')

let filesUrl;
let token = argv.t
let part = argv.m
let project = argv.p

getProject();

if (!!token && !!project) {
  let projectUrl =  process.cwd()+'/';
  let distUrl = projectUrl + 'dist/';

  function getTime(){
    let date = new Date(),
      m = date.getMonth()+1,
      d = date.getDate(),
      h = date.getHours(),
      mn = date.getMinutes();

    let M = (m < 10 ? '0'+m : ''+m);
    let D = (d < 10 ? '0' + d : ''+d);
    let _h = (h < 10 ? '0'+ h : ''+h);
    let _m = (mn < 10 ? '0'+ mn : ''+mn);

    return M+D+_h+_m;
  }

  function up(fileName,token) {
    filesUrl = path.resolve(projectUrl, `${fileName}.zip`)

    let upData = new FormData();

    let targetUrl
    if(part == 'test'){
      upData.append('tokentest',token)
      upData.append('filetest',fs.createReadStream(filesUrl))

      targetUrl =  `https://cdc.pconline.com.cn/project/u${project}/test.php`;
    }else{
      upData.append('token',token)
      upData.append('file',fs.createReadStream(filesUrl))

      targetUrl =  `https://cdc.pconline.com.cn/project/u${project}/dist.php`;
    }

    console.log('\n打包完成, 上传中...\n');

    return axios({
      method:'post',
      url :targetUrl,
      data : upData,
      headers: upData.getHeaders(),
      timeout: 30000,
    }).then(res => {

      let data = res.data
      console.log(data);


      console.log('\n'+data.msg)

      fs.unlink(filesUrl,(err)=>{
        if (err) {
          console.log('上传成功, 删除失败');
        }

        console.log('上传成功, 删除本地包');
      })

    }).catch((err) => {
      console.log('错误信息:', err.response.status);

      fs.unlink(filesUrl,(err)=>{
        console.log('上传发生错误,请检查!')
      })
    });
  }

  function readDir(zip, distUrl) {
    let files = fs.readdirSync(distUrl);

    let self = arguments.callee

    files.forEach(function (fileName, index) {
      if(fileName.indexOf('.')!==0){
        let filePath = distUrl +fileName;
        let file = fs.statSync(filePath);

        console.log('已添加: '+filePath)

        if (file.isDirectory()) {
          self(zip.folder(fileName), filePath+'/');
        } else {
          zip.file(fileName, fs.readFileSync(filePath));
        }
      }
    });
  }


  function pack(fileName){
    console.log('\n打包中\n');

    let fileUrl = projectUrl+`${fileName}.zip`

    let zip = new JSZip();
    readDir(zip, distUrl);

    return zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
          level: 9
      }
    }).then(function (content) {
      fs.writeFileSync(fileUrl, content, "utf-8");
    });
  }


  let fileName = getTime()

  pack(fileName).then(()=>{
    up(fileName,token)
  })

}else{
  console.log('检查token或者项目名')
}

function getProject() {
  if(project) {
    return;
  }
  try {
    const ROOTPATH = process.cwd()
    const pakgeJson = fs.readFileSync(path.join(ROOTPATH,'package.json'), 'utf8');
    project = JSON.parse(pakgeJson).cdcu;
    if(!project)
    throw 'package.json 没有配置项目名';
  } catch (error) {
    console.log('项目名解析失败 err-->',error);
  }
}

process.on('SIGINT', function () {
  if (!!filesUrl) {
    fs.unlink(filesUrl,(err)=>{
    })
  }
  console.log('\n 你已终止操作')
  process.exit();
});


