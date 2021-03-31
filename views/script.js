const imageUpload = document.getElementById('imageUpload')
const btnsave = document.querySelector('#savebtn');
const vid = document.querySelector('video');
const namefield = document.querySelector('#name');
const imageView = document.querySelector('img');
clickImage();


function startInterval(labeledFaceDescriptors) {
  btnsave.style.display = "none";
  namefield.style.display = "none";
  imageView.style.display = "none";

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)

  setInterval(async () => {
    
    const canvas = document.createElement('canvas'); // create a canvas
    const ctx = canvas.getContext('2d'); // get its context
    canvas.width = vid.videoWidth; // set its size to the one of the video
    canvas.height = vid.videoHeight;
    ctx.drawImage(vid, 0, 0); // the video
    
    var image = canvas.toDataURL("image/jpeg");
    const img = await faceapi.fetchImage(image)
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors()
    if (detections.length == 0) { console.log('No one there') }

    const displaySize = { width: canvas.width, height: canvas.height }
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
    results.forEach((result, i) => {
      if (result.label == "unknown") {
        console.log('Someone else')
      }
      else {
        console.log('good')
      }
    })


  }, Math.floor(Math.random() * 7000) + 5000);
}

async function loadLabeledImages() {
  let nameval = namefield.value;
  const labels = [nameval]
  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      const img = await faceapi.fetchImage(localStorage.getItem("Image"))
      try {
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detections.descriptor)
        startInterval(new faceapi.LabeledFaceDescriptors(label, descriptions));
      }
      catch (e) {
        alert("Face not Clear Try Again!!")
        return false;
      }
    })
  )
}
// }
//-------------===========------------------
function clickImage() {

  imageUpload.style.display = "none";
  navigator.mediaDevices.getUserMedia({ video: true }) // request cam
    .then(stream => {
      vid.srcObject = stream; // don't use createObjectURL(MediaStream)
      return vid.play(); // returns a Promise
    })
    .then(() => { // enable the button
      btnsave.disabled = false;
      btnsave.onclick = e => {
        takeASnap()
        // .then(download);
      };
    })
    .catch(e => console.log(e,'please use the fiddle instead'));

  function takeASnap() {
    const canvas = document.createElement('canvas'); // create a canvas
    const ctx = canvas.getContext('2d'); // get its context
    canvas.width = vid.videoWidth; // set its size to the one of the video
    canvas.height = vid.videoHeight;
    ctx.drawImage(vid, 0, 0); // the video
    var imgAsDataURL = canvas.toDataURL("image/jpeg");

    // Save image into localStorage
    try {
      localStorage.setItem("Image", imgAsDataURL);
      imageView.src = localStorage.getItem("Image");
      loadLabeledImages();
    }
    catch (e) {
      console.log("Storage failed: " + e);
    }
  }
  Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
  ]).then(function () { console.log("LOADED") })

}