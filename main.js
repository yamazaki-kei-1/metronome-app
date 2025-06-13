// DOM要素の取得
const bpmDisplay = document.getElementById('bpmValue');
const bpmSlider = document.getElementById('bpmSlider');
const bpmMinus = document.getElementById('bpmMinus');
const bpmPlus = document.getElementById('bpmPlus');
const beatVisual = document.getElementById('beatVisual');
const startStopBtn = document.getElementById("startStopBtn");

const timeSignatureBeatsInput = document.getElementById('timeSignatureBeats');
const timeSignatureNoteInput = document.getElementById('timeSignatureNote');

const soundSelect = document.getElementById('soundSelect');
const subdivisionSelect = document.getElementById('subdivision');
const bpmStepInput = document.getElementById('bpmStep');
const bpmStepEveryMeasureInput = document.getElementById('bpmStepEveryMeasure');
const bpmStepEverySecondsInput = document.getElementById('bpmStepEverySeconds');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const accentFirstBeatCheckbox = document.getElementById('accentFirstBeat');

const offcanvasElement = document.getElementById('offcanvasCustomSettings');
const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
let offcanvasInstance; // Bootstrap Offcanvas インスタンスを保持

// グローバル変数
let currentBPM = 100;
let isPlaying = false;
let metronomeInterval;
let currentBeat = 0;
let timeSignatureBeats = 4; // 拍子記号の分子 (4/4拍子なら4)
let timeSignatureNote = 4;  // 拍子記号の分母 (4/4拍子なら4)
let subdivision = 'none'; // 補助リズム (none, triplet, dotted, offbeat, 2beat, 8beat, 16beat, swing, shuffle, custom)
let bpmStep = 5; // BPM上昇ステップ
let bpmStepEveryMeasure = 0; // 何小節ごとにBPMを上げるか (0で無効)
let bpmStepEverySeconds = 0; // 何秒ごとにBPMを上げるか (0で無効)
let measuresPlayed = 0; // 演奏した小節数
let secondsPlayed = 0; // 演奏した秒数
let secondsTimer; // 秒数計測用タイマー
let accentFirstBeat = true; // 1拍目にアクセントをつけるか

// サウンドの読み込み
const click1Sound = new Audio('sounds/click1.mp3');
const click2Sound = new Audio('sounds/click2.mp3');
const click1SubSound = new Audio('sounds/click1_sub.mp3');
const click2SubSound = new Audio('sounds/click2_sub.mp3');
const click1AccentSound = new Audio('sounds/click1_accent.mp3');
const click2AccentSound = new Audio('sounds/click2_accent.mp3');

const kickSound = new Audio('sounds/kick.mp3');
const snareSound = new Audio('sounds/snare.mp3');
const hihatSound = new Audio('sounds/hihat.mp3');

// --- 関数定義 ---

function playClick(beatNumber) {
    let soundToPlay;
    let accentSound;
    let subSound;

    // 現在選択されているサウンドに基づいて音源を設定
    if (soundSelect.value === 'click1') {
        soundToPlay = click1Sound;
        accentSound = click1AccentSound;
        subSound = click1SubSound;
    } else { // click2
        soundToPlay = click2Sound;
        accentSound = click2AccentSound;
        subSound = click2SubSound;
    }

    // 各サウンドを複製して同時に再生できるようにする
    const currentSound = soundToPlay.cloneNode();
    const currentAccentSound = accentSound.cloneNode();
    const currentSubSound = subSound.cloneNode();

    if (accentFirstBeat && beatNumber === 0) { // 0は1拍目
        currentAccentSound.play();
        beatVisual.children[beatNumber].classList.add('accent');
    } else {
        currentSound.play();
    }

    // 拍子の表示を更新
    Array.from(beatVisual.children).forEach((circle, index) => {
        circle.classList.remove('active', 'accent');
        if (index === beatNumber) {
            circle.classList.add('active');
        }
    });

    // 補助リズムの再生
    if (subdivision !== 'none') {
        const interval = getIntervalFromBpm(currentBPM);
        const subInterval = interval / (timeSignatureNote / 4); // 4分音符を基準に間隔を調整

        switch (subdivision) {
            case 'triplet': // 3連符
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval / 3);
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval * 2 / 3);
                break;
            case 'dotted': // 付点
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval * 0.75);
                break;
            case 'offbeat': // 裏打ち
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval / 2);
                break;
            case '2beat': // 2ビート (バスドラ、ハイハット、ハイハット、ハイハット)
                if (beatNumber === 0) kickSound.cloneNode().play();
                hihatSound.cloneNode().play();
                break;
            case '8beat': // 8ビート (バスドラ、ハイハット、スネア、ハイハット、バスドラ、ハイハット、スネア、ハイハット)
                if (beatNumber === 0) kickSound.cloneNode().play();
                else if (beatNumber === 2) snareSound.cloneNode().play();
                hihatSound.cloneNode().play();
                break;
            case '16beat': // 16ビート (さらに細かいリズム)
                if (beatNumber === 0) kickSound.cloneNode().play();
                else if (beatNumber === 2) snareSound.cloneNode().play();
                hihatSound.cloneNode().play();
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval / 4);
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval / 2);
                setTimeout(() => currentSubSound.cloneNode().play(), subInterval * 3 / 4);
                break;
            // 他の補助リズムのケースを追加
            case 'swing':
            case 'shuffle':
            case 'custom':
                // ここにそれぞれのリズムのロジックを追加
                break;
        }
    }
}

function updateVisual() {
    beatVisual.innerHTML = ''; // 既存の拍子表示をクリア
    for (let i = 0; i < timeSignatureBeats; i++) {
        const beatCircle = document.createElement('div');
        beatCircle.classList.add('beat-circle');
        beatVisual.appendChild(beatCircle);
    }
}

function getIntervalFromBpm(bpm) {
    // BPMをミリ秒単位の間隔に変換
    return 60000 / bpm;
}

function startMetronome() {
    if (isPlaying) return;

    isPlaying = true;
    startStopBtn.textContent = "◼"; // 停止アイコンに変更
    currentBeat = 0;
    measuresPlayed = 0;
    secondsPlayed = 0;

    // BPM上昇タイマーを開始
    if (bpmStepEverySeconds > 0) {
        secondsTimer = setInterval(() => {
            secondsPlayed++;
            if (secondsPlayed % bpmStepEverySeconds === 0) {
                currentBPM += bpmStep;
                bpmDisplay.textContent = currentBPM;
                bpmSlider.value = currentBPM;
                stopMetronome(); // 一度停止して新しいBPMで再開
                startMetronome();
            }
        }, 1000); // 1秒ごとにカウント
    }

    // メトロノームのクリックを開始
    metronomeInterval = setInterval(() => {
        playClick(currentBeat);
        currentBeat++;
        if (currentBeat >= timeSignatureBeats) {
            currentBeat = 0;
            measuresPlayed++; // 小節数をカウント

            // 小節数によるBPM上昇
            if (bpmStepEveryMeasure > 0 && measuresPlayed % bpmStepEveryMeasure === 0) {
                currentBPM += bpmStep;
                bpmDisplay.textContent = currentBPM;
                bpmSlider.value = currentBPM;
                stopMetronome(); // 一度停止して新しいBPMで再開
                startMetronome();
            }
        }
    }, getIntervalFromBpm(currentBPM) * (timeSignatureNote / 4)); // 4分音符の拍子で間隔を計算
}

function stopMetronome() {
    isPlaying = false;
    startStopBtn.textContent = "▶"; // 再生アイコンに変更
    clearInterval(metronomeInterval);
    clearInterval(secondsTimer); // 秒数計測タイマーも停止
    Array.from(beatVisual.children).forEach(circle => {
        circle.classList.remove('active', 'accent');
    });
}

// saveSettings 関数をDOMContentLoadedの外に定義 (重要)
function saveSettings() {
    console.log("Saving settings...");
    localStorage.setItem('bpm', currentBPM);
    localStorage.setItem('timeSignatureBeats', timeSignatureBeats);
    localStorage.setItem('timeSignatureNote', timeSignatureNote);
    localStorage.setItem('selectedSound', soundSelect.value);
    localStorage.setItem('selectedSubdivision', subdivisionSelect.value);
    localStorage.setItem('bpmStep', bpmStepInput.value);
    localStorage.setItem('bpmStepEveryMeasure', bpmStepEveryMeasureInput.value);
    localStorage.setItem('bpmStepEverySeconds', bpmStepEverySecondsInput.value);
    localStorage.setItem('accentFirstBeat', accentFirstBeatCheckbox.checked);

    alert('設定を保存しました！');
    // オフキャンバスを閉じる (小さい画面の場合)
    if (window.innerWidth < 768) {
        offcanvasInstance.hide();
    }
}

// loadSettings 関数をDOMContentLoadedの外に定義 (重要)
function loadSettings() {
    console.log("Loading settings...");
    const savedBPM = localStorage.getItem('bpm');
    if (savedBPM) {
        currentBPM = parseInt(savedBPM);
        bpmDisplay.textContent = currentBPM;
        bpmSlider.value = currentBPM;
    }

    const savedBeats = localStorage.getItem('timeSignatureBeats');
    if (savedBeats) {
        timeSignatureBeats = parseInt(savedBeats);
        timeSignatureBeatsInput.value = timeSignatureBeats;
    }

    const savedNote = localStorage.getItem('timeSignatureNote');
    if (savedNote) {
        timeSignatureNote = parseInt(savedNote);
        timeSignatureNoteInput.value = timeSignatureNote;
    }

    const savedSound = localStorage.getItem('selectedSound');
    if (savedSound) {
        soundSelect.value = savedSound;
    }

    const savedSubdivision = localStorage.getItem('selectedSubdivision');
    if (savedSubdivision) {
        subdivisionSelect.value = savedSubdivision;
    }

    const savedBpmStep = localStorage.getItem('bpmStep');
    if (savedBpmStep) {
        bpmStep = parseInt(savedBpmStep); // intに変換
        bpmStepInput.value = bpmStep;
    }

    const savedBpmStepEveryMeasure = localStorage.getItem('bpmStepEveryMeasure');
    if (savedBpmStepEveryMeasure) {
        bpmStepEveryMeasure = parseInt(savedBpmStepEveryMeasure); // intに変換
        bpmStepEveryMeasureInput.value = bpmStepEveryMeasure;
    }

    const savedBpmStepEverySeconds = localStorage.getItem('bpmStepEverySeconds');
    if (savedBpmStepEverySeconds) {
        bpmStepEverySeconds = parseInt(savedBpmStepEverySeconds); // intに変換
        bpmStepEverySecondsInput.value = bpmStepEverySeconds;
    }

    const savedAccentFirstBeat = localStorage.getItem('accentFirstBeat');
    if (savedAccentFirstBeat !== null) {
        accentFirstBeat = (savedAccentFirstBeat === 'true');
        accentFirstBeatCheckbox.checked = accentFirstBeat;
    }
    updateVisual(); // BPMや拍子設定が読み込まれたら、ビジュアルを更新
}


// --- イベントリスナー ---

bpmMinus.addEventListener('click', () => {
    currentBPM = Math.max(40, currentBPM - 1);
    bpmDisplay.textContent = currentBPM;
    bpmSlider.value = currentBPM;
    if (isPlaying) {
        stopMetronome();
        startMetronome();
    }
});

bpmPlus.addEventListener('click', () => {
    currentBPM = Math.min(300, currentBPM + 1);
    bpmDisplay.textContent = currentBPM;
    bpmSlider.value = currentBPM;
    if (isPlaying) {
        stopMetronome();
        startMetronome();
    }
});

bpmSlider.addEventListener('input', () => {
    currentBPM = parseInt(bpmSlider.value);
    bpmDisplay.textContent = currentBPM;
    if (isPlaying) {
        stopMetronome();
        startMetronome();
    }
});

timeSignatureBeatsInput.addEventListener('change', () => {
    const value = parseInt(timeSignatureBeatsInput.value);
    if (!isNaN(value) && value >= 1) {
        timeSignatureBeats = value;
        updateVisual();
        if (isPlaying) {
            stopMetronome();
            startMetronome();
        }
    }
});

timeSignatureNoteInput.addEventListener('change', () => {
    const value = parseInt(timeSignatureNoteInput.value);
    if (!isNaN(value) && value >= 1) {
        timeSignatureNote = value;
        if (isPlaying) {
            stopMetronome();
            startMetronome();
        }
    }
});

subdivisionSelect.addEventListener('change', () => {
    subdivision = subdivisionSelect.value;
});

accentFirstBeatCheckbox.addEventListener('change', () => {
    accentFirstBeat = accentFirstBeatCheckbox.checked;
});

soundSelect.addEventListener('change', () => {
    // サウンドが変更された際の処理は、playClick関数内で選択されるため、ここでは特に不要
});

bpmStepInput.addEventListener('change', () => {
    const value = parseInt(bpmStepInput.value);
    if (!isNaN(value) && value >= 0) {
        bpmStep = value;
    }
});

bpmStepEveryMeasureInput.addEventListener('change', () => {
    const value = parseInt(bpmStepEveryMeasureInput.value);
    if (!isNaN(value) && value >= 0) {
        bpmStepEveryMeasure = value;
    }
});

bpmStepEverySecondsInput.addEventListener('change', () => {
    const value = parseInt(bpmStepEverySecondsInput.value);
    if (!isNaN(value) && value >= 0) {
        bpmStepEverySeconds = value;
    }
});


startStopBtn.addEventListener("click", () => {
    if (isPlaying) {
        stopMetronome();
    } else {
        startMetronome();
    }
});

// saveSettingsBtn のイベントリスナー (関数定義の後に来るように)
saveSettingsBtn.addEventListener('click', saveSettings);

toggleSettingsBtn.addEventListener('click', () => {
    // Bootstrap Offcanvas のメソッドを呼び出す
    offcanvasInstance.toggle();
});


// DOMContentLoaded イベントで初期化処理を実行
document.addEventListener('DOMContentLoaded', () => {
    loadSettings(); // DOMContentLoaded内で設定を読み込む
    updateVisual(); // 初期ビジュアルの更新

    // Bootstrap Offcanvas のインスタンスを作成
    offcanvasInstance = new bootstrap.Offcanvas(offcanvasElement);

    // 画面幅に応じてオフキャンバスの初期状態を設定
    const applyOffcanvasVisibility = () => {
        if (window.innerWidth >= 768) {
            offcanvasInstance.show(); // 大きい画面では常に表示状態
        } else {
            offcanvasInstance.hide(); // 小さい画面では閉じる
        }
    };

    // ページロード時に適用
    applyOffcanvasVisibility();

    // ウィンドウのリサイズイベントを監視し、表示状態を調整する
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            applyOffcanvasVisibility();
        }, 200); // 200msのディレイでリサイズ処理を最適化
    });

    // サウンドファイルをプリロード
    try {
        click1AccentSound.load();
        click2AccentSound.load();
        kickSound.load();
        snareSound.load();
        hihatSound.load();
    } catch (e) {
        console.warn("サウンドファイルの読み込みに失敗しました。ファイルが存在するか確認してください。", e);
    }
});