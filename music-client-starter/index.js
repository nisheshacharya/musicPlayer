"usestrict"
const BASE_URL = 'http://localhost:3000';

let nowPlaying = document.querySelector(".now-playing");
let songTitle = document.querySelector(".song-title");
let playpauseBtn = document.querySelector(".playpause-song");
let nextBtn = document.querySelector(".next-song");
let prevBtn = document.querySelector(".prev-song");
let playMode = document.querySelector(".play-mode");
let seekSlider = document.querySelector(".seek-slider");
let volumeSlider = document.querySelector(".volume-slider");
let currTime = document.querySelector(".current-time");
let totalDuration = document.querySelector(".total-duration");

//as a global variables
let currentSongIndex = 0;
let isPlaying = false;
let shuffleMode = false;
let repeatMode = false;
let defaultMode = true;
let setModeCount = 0;
let playingSongId;

let updateTimer;
let playListBackUp;

let currentSong = document.createElement('audio');

window.onload = function () {
    if (localStorage.getItem('token')) {
        getAllSongs();
        getAllPlayListSongs();
        showHide({ musicSection: 'show', loginSection: 'hide', logoutSection: 'show' });
        document.getElementById('user').textContent = 'Welcome ' + localStorage.getItem('username').toUpperCase();
    } else {
        showHide({ musicSection: 'hide', loginSection: 'show', logoutSection: 'hide' })
    }
    document.getElementById('logoutBtn').onclick = logout;
    document.getElementById('login-form').onsubmit = login;
    document.getElementById('searchBtn').onclick = searchSong;

}
async function searchSong() {
    const searchKeyword = document.getElementById('search-song').value;
    const response = await fetch(BASE_URL + '/api/music?search=' + searchKeyword,
        {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
    const filteredSongs = await response.json();
    populateToMusicTable(filteredSongs);
}

async function getAllSongs() {
    const response = await fetch(BASE_URL + '/api/music',
        {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })
    const songs = await response.json();
    populateToMusicTable(songs);
}
async function getAllPlayListSongs() {
    const response = await fetch(BASE_URL + '/api/playlist',
        {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
    const playList = await response.json();
    playListBackUp = playList;
    populateToPlayListTable(playList);
    if (isPlayListEmpty(playList)) {
        document.getElementById("empty-table").innerHTML = `<small>Songs not added yet</small>`;
        document.querySelector('.player').style.display = 'none';
    } else {
        if (isPlaying) {
            //document.querySelector(`[value="${playingSongId}"]`).innerHTML = '<i class="fa fa-play-circle fa-2x"></i>'

            //syncPlayPauseIconEveryWhere('<i class="fa fa-pause-circle fa-2x"></i>')
        }
        document.getElementById("empty-table").innerHTML = `<small>${playList.length} songs in your play list</small>`;
    }
}

populateToMusicTable = (songs) => {
    let tBody = ''
    songs.forEach((song, index) => {
        tBody += `<tr id="row${index + 1}">
                 <td>
                     <span>${index + 1}</span>
                     <span style="display:none">${song.id}</span>
                 </td>
                 <td>${song.title}</td>
                 <td>${song.releaseDate}</td>
                 <td>
                     <button 
                         class="song-list-btn" 
                         value= ${song.id} 
                         onclick="addToPlayList(this)"
                     </button>
                     <i class="fa fa-plus-circle fa-2x"></i>
                 </td>
                 </tr>`
    });

    let musicTable = `<h2>Songs For You</h2>
                        <table class="table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Title</th>
                              <th>Release Date</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody> ${tBody}</tBody>
                        </table>`
    document.getElementById('musiclist-table-container').innerHTML = musicTable;
}

populateToPlayListTable = (playList) => {
    let tBody = ''
    playList.forEach((song, index) => {
        tBody += `<tr id="row${index + 1}">
                <td>
                    <span>${index + 1}</span>
                    <span style="display:none">${song.songId}</span>
                </td>
                <td>${song.title}</td>
                <td><button
                        aria-hidden="true" 
                        value=${song.songId} 
                        onclick="removeFromPlayList(this)"
                        class="remove-btn"
                    </button>
                    <i class="fa fa-minus-circle fa-2x"></i>
                </td>
                <td><button 
                        id = "${song.songId}"
                        value='${index}' 
                        onclick="playpauseSong(this)" 
                        class= "play-list-btn"
                        </button>
                        <i class="fa fa-play-circle fa-2x"></i>
                    </td>
                </tr>`
    });
    let playListTable = `<h2>Your Playlist</h2>
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody> ${tBody}</tBody>
    </table>`
    document.getElementById('playlist-table-container').innerHTML = playListTable;

}

async function addToPlayList(currentBtn) {
    console.log("adding song to the playlist");
    let TOKEN = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/api/playlist/add`, {
        method: 'POST',
        body: JSON.stringify({
            "songId": currentBtn.value
        }),
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    //refresh play list
    if (response.status) {
        getAllPlayListSongs();
    }
}

async function removeFromPlayList(currentBtn) {
    console.log("removing song from the playlist");
    let TOKEN = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/api/playlist/remove`, {
        method: 'POST',
        body: JSON.stringify({
            "songId": currentBtn.value
        }),
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    if (currentSong.value === currentBtn.value) {
        //clear song from current player section
        resetPlayerSection();
    }
    //refresh play list

    getAllPlayListSongs();
}

function loadSong(songIndex) {
    currentSongIndex = parseInt(songIndex);
    document.querySelector(".player").style.display = 'block';
    clearInterval(updateTimer);
    resetValues();
    currentSong.src = BASE_URL + "/" + playListBackUp[currentSongIndex].urlPath;
    currentSong.value = playListBackUp[currentSongIndex].songId;
    //currentSong.load();
    songTitle.textContent = playListBackUp[currentSongIndex].title;
    updateTimer = setInterval(seekUpdate, 1000);
    currentSong.addEventListener('ended', nextSong);
    randomBgColor();

}

function playSong(currentBtn) {
    if (currentBtn) {
        loadSong(currentBtn.value);
        playingSongId = currentBtn.id;
        currentBtn.innerHTML = '<i class="fa fa-pause-circle fa-2x"></i>';
    }
    currentSong.play();
    isPlaying = true;
    playpauseBtn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>';
}

function playpauseSong(currentBtn) {
    if (!isPlaying) {
        playSong(currentBtn);
        syncPlayPauseIconEveryWhere('<i class="fa fa-pause-circle fa-2x"></i>')
    }
    else {
        pauseSong(currentBtn);
        syncPlayPauseIconEveryWhere('<i class="fa fa-play-circle fa-2x"></i>')
    }
}
function syncPlayPauseIconEveryWhere(icon) {
    const buttonCollection = document.getElementsByClassName('play-list-btn');
    for (let i = 0; i < buttonCollection.length; i++) {
        if (playListBackUp[currentSongIndex].songId === buttonCollection[i].id) {
            console.log(buttonCollection[i]);
            buttonCollection[i].innerHTML = icon
        }
    }
}

function prevSong() {
    if (repeatMode) {
        currentSongIndex = currentSongIndex;
    }
    if (shuffleMode) {
        currentSongIndex = Math.floor(Math.random() * playListBackUp.length)
    }
    if (defaultMode) {
        if (currentSongIndex > 0) {
            currentSongIndex -= 1;
        }
        else {
            currentSongIndex = playListBackUp.length - 1;
        }
    }

    loadSong(currentSongIndex);
    playSong();
}

function nextSong() {
    //it is not needed to write tho
    if (repeatMode) {
        currentSongIndex = currentSongIndex;
    }
    if (shuffleMode) {
        currentSongIndex = Math.floor(Math.random() * playListBackUp.length)
    }
    if (defaultMode) {
        if (currentSongIndex < playListBackUp.length - 1) {
            currentSongIndex += 1;
        }
        else {
            currentSongIndex = 0;
        }
    }
    loadSong(currentSongIndex);
    playSong();
}

function pauseSong(currentBtn) {
    if (currentBtn) {
        currentBtn.innerHTML = '<i class="fa fa-play-circle fa-2x"></i>';
    }
    currentSong.pause();
    isPlaying = false;
    playpauseBtn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';;
}

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const requestBody = {
        username: username,
        password: password
    }
    const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
        const result = await response.json();
        localStorage.setItem('token', result.accessToken);
        localStorage.setItem('username', result.username);
        document.getElementById('user').textContent = 'Welcome ' + result.username.toUpperCase();
        //location.href = 'welcome.html';
        getAllSongs();
        getAllPlayListSongs();
        showHide({ musicSection: 'show', loginSection: 'hide', logoutSection: 'show' })
        document.getElementById('errorMsg').innerText = '';
    } else {
        document.getElementById('errorMsg').innerText = 'Incorrect username and password';
    }
}

function logout() {
    resetPlayerSection();
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    showHide({ musicSection: 'hide', loginSection: 'show', logoutSection: 'hide' })
}

function setPlayMode() {
    setModeCount++;
    switch (setModeCount) {
        case 1: {
            defaultMode = false;
            repeatMode = true;
            shuffleMode = false;
            playMode.innerHTML = '<i class="fa fa-repeat fa-2x"></i>'
            break;
        }
        case 2: {
            defaultMode = false;
            repeatMode = false;
            shuffleMode = true;
            playMode.innerHTML = '<i class="fa fa-random fa-2x"></i>';
            break;
        }
        default:
            {
                playMode.innerHTML = '<i class="fa fa-bullseye fa-2x"></i>';
                defaultMode = true;
                repeatMode = false;
                shuffleMode = false;
                setModeCount = 0;
            }
    }
}

function showHide(showHideObject) {
    document.getElementById('music-section').style.display = showHideObject.musicSection === 'hide' ? 'none' : 'block'
    document.getElementById('login-section').style.display = showHideObject.loginSection === 'hide' ? 'none' : 'block'
    document.getElementById('logout-section').style.display = showHideObject.logoutSection === 'hide' ? 'none' : 'block'
}

function isPlayListEmpty(playList) {
    return playList.length == 0;
}

function resetValues() {
    currTime.textContent = "00:00";
    totalDuration.textContent = "00:00";
    seekSlider.value = 0;
}

function resetPlayerSection() {
    currentSong.src = '';
    songTitle.textContent = ''
    nowPlaying.textContent = ''
    playpauseBtn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';;
    clearInterval(updateTimer);
    resetValues();
}

/**
 * extra stuffs
 * 
 */

function seekTo() {
    let seekto = currentSong.duration * (seekSlider.value / 100);
    currentSong.currentTime = seekto;
}

function seekUpdate() {
    let seekPosition = 0;

    if (!isNaN(currentSong.duration)) {
        seekPosition = currentSong.currentTime * (100 / currentSong.duration);

        seekSlider.value = seekPosition;

        let currentMinutes = Math.floor(currentSong.currentTime / 60);
        let currentSeconds = Math.floor(currentSong.currentTime - currentMinutes * 60);
        let durationMinutes = Math.floor(currentSong.duration / 60);
        let durationSeconds = Math.floor(currentSong.duration - durationMinutes * 60);

        if (currentSeconds < 10) { currentSeconds = "0" + currentSeconds; }
        if (durationSeconds < 10) { durationSeconds = "0" + durationSeconds; }
        if (currentMinutes < 10) { currentMinutes = "0" + currentMinutes; }
        if (durationMinutes < 10) { durationMinutes = "0" + durationMinutes; }

        currTime.textContent = currentMinutes + ":" + currentSeconds;
        totalDuration.textContent = durationMinutes + ":" + durationSeconds;
    }
}

function setVolume() {
    currentSong.volume = volumeSlider.value / 100;
}


function randomBgColor() {
    let red = Math.floor(Math.random() * 256) + 64;
    let green = Math.floor(Math.random() * 256) + 64;
    let blue = Math.floor(Math.random() * 256) + 64;
    let bgColor = "radial-gradient(circle, rgb(" + red + "," + green + "," + blue + ")" + 0 + "%" + "," + "rgb(" + red + "," + green + "," + blue + ")" + 0 + "%)";
    document.querySelector('.player').style.background = bgColor;
}

