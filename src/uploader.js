import {
  read,
  write,
  update,
  destroy
} from './localStorage'
import * as faceapi from 'face-api.js'

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

const uploadFile = file => {
  return new Promise((resolve, reject) => {
    window.requestFileSystem(window.TEMPORARY, 1024 * 1024, function(fs) {
      fs.root.getFile(`${file.name}${+new Date()}`, {create: true, exclusive: true}, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          fileWriter.write(file);
          resolve(fileEntry)
        }, e => console.log(e));
      }, e => console.log(e));
    })
  })
}
const fileEntryPathToObjectUrl = async fileEntryPath => {
  return URL.createObjectURL(await new Promise((resolve, reject) => {
    window.requestFileSystem(window.TEMPORARY, 1024 * 1024, function(fs) {
      fs.root.getFile(fileEntryPath, {create: true, exclusive: false}, function(fileEntry) {
        fileEntry.file(resolve, reject)
      }, e => console.log(e));
    })
  }))
}

const uploader = (submitSelector, imagesListSelector) => {
  const submit = document.querySelector(submitSelector);
  const imagesList = document.querySelector(imagesListSelector);
  const imageDescriptors = [];
  let faceMatcher;

  const processFace = async (image, imageContainer, id) => {
    const detection = await faceapi.detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
                                   .withFaceLandmarks()
                                   .withFaceDescriptor()
    if(typeof detection === 'undefined') {
      imageContainer.querySelector('.status').innerText = 'No tiene cara';
      return
    };

    imageDescriptors.push({
      id: id,
      detection
    });
    imageContainer.querySelector('.status').innerText = 'Procesado';

    faceMatcher = new faceapi.FaceMatcher(imageDescriptors.map(faceDescriptor => (
      new faceapi.LabeledFaceDescriptors(
        (faceDescriptor.id).toString(),
        [faceDescriptor.detection.descriptor]
      )
    )))
  }
  const syncImages = () => {
    while (imagesList.firstChild) {
      imagesList.removeChild(imagesList.firstChild)
    }
    read().forEach(async image => {
      const imageContainer = document.createElement('div');
      const label = document.createElement('input');
      const imageElement = document.createElement('img');
      const status = document.createElement('div');
      const deleteLink = document.createElement('a');
      imageContainer.classList.add('image-container');
      imageContainer.id = image.id;
      deleteLink.href = "#";
      deleteLink.innerText = "X";
      status.classList.add('status');

      status.innerText = 'Pendiente';
      imageElement.src = await fileEntryPathToObjectUrl(image.path);
      label.value = image.name;

      label.addEventListener('keyup', e =>
        update(image.id, {
          name: e.target.value
        }))

      deleteLink.addEventListener('click', e => {
        e.preventDefault();
        destroy(image.id)
        syncImages();
      })

      imageContainer.appendChild(deleteLink);
      imageContainer.appendChild(status);
      imageContainer.appendChild(imageElement);
      imageContainer.appendChild(label);

      imagesList.appendChild(imageContainer)
      processFace(imageElement, imageContainer, image.id);
    })
  }

  submit.addEventListener('change', async e => {
    const fileEntry = await uploadFile(e.target.files[0]);

    write([
      ...read(),
      {
        id: +new Date(),
        path: fileEntry.fullPath,
        name: (+new Date()).toString()
      }
    ])
    syncImages()
  })

  syncImages();

  return descriptor => {
    if(!faceMatcher || !descriptor) return;
    const match = faceMatcher.findBestMatch(descriptor);
    [...imagesList.children].forEach(image => {
      if(match.label === image.id) {
        image.classList.add('selected');
        return
      }
      return image.classList.remove('selected')
    })

    return match
  }
}

export default uploader
