import 'babel-polyfill'
import * as faceapi from 'face-api.js'
import uploader from './uploader.js'

const main = async () => {
  const videoContainer = document.querySelector('.js-video')
  const canvas = document.querySelector('.js-canvas')
  const context = canvas.getContext('2d')
  const video = await navigator.mediaDevices.getUserMedia({ video: true })

  await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  await faceapi.nets.faceExpressionNet.loadFromUri('/models')
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models')

  const match = uploader('.input-submit', '.images-list');

  videoContainer.srcObject = video

  const reDraw = async () => {
    context.drawImage(videoContainer, 0, 0, 640, 480)

    requestAnimationFrame(reDraw)
  }

  const processFace = async () => {
    const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
                                   .withFaceLandmarks()
                                   .withFaceDescriptor()
    if(typeof detection === 'undefined') return;

    match(detection.descriptor)
  }

  setInterval(processFace, 1000)

  requestAnimationFrame(reDraw)
}

main()
