/* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
window.AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = new AudioContext();
let audioInput = null;
let realAudioInput = null;
let inputPoint = null;
let audioRecorder = null;
let bufferSize = 2048;
let mono = true;


function toggleRecording( e ) {
    if (e.classList.contains("recording")) {
        e.classList.remove("recording");
        // stop recording
        audioRecorder.stop();
        // export wav to blob
        audioRecorder.exportWAV(function (blob) {
            // export blob to base64
            convertBlobToBase64(blob).then(function(base64) {
                return getMelody(base64);
            });
        });
    } else {
        e.classList.add("recording");
        // start recording
        if (!audioRecorder)
            return;
        audioRecorder.clear();
        audioRecorder.record();
    }
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = bufferSize;
    inputPoint.connect(analyserNode);

    audioRecorder = new Recorder(inputPoint, {
        bufferLen: bufferSize,
        numChannels: (mono) ? 1 : 2,
        mimeType: 'audio/wav'
    });

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect( zeroGain );
    zeroGain.connect(audioContext.destination);
}

function initAudio() {
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!navigator.cancelAnimationFrame)
        navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
    if (!navigator.requestAnimationFrame)
        navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

window.addEventListener('load', initAudio );

const convertBlobToBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
});