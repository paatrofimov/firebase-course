var stopWordsFound = 0;
var levelIndex = -1;
var misses = 0;

// 0. Create new Firebase app. https://console.firebase.google.com/ and import stop-hunter-export.json.

function signInGoogle() {
    // 1. Sign in with firebase. https://firebase.google.com/docs/auth/web/google-signin
    firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(e => `error while sighing with google: ${e.message}`);
}

function signInGithub() {
    // 1. Sign in with firebase. https://firebase.google.com/docs/auth/web/google-signin
    firebase.auth().signInWithPopup(new firebase.auth.GithubAuthProvider())
        .catch(e => {
            console.log(`error while sighing with github: ${e.message}`);
            var credential = e.credential;
            firebase.auth().signInWithCredential(credential)
                .catch(e => console.log(`error while sighing with credentials with github: ${e.message}`));
        });
}

function signOut() {
    // 2. Sign out with firebase. https://firebase.google.com/docs/auth/web/google-signin#next_steps
    firebase.auth().signOut()
        .catch(e => `error while sighing out: ${e.message}`);
}

window.onload = function() {
    // 3. Subscribe on sign in changes. https://firebase.google.com/docs/auth/web/manage-users
    firebase.auth().onAuthStateChanged(user => updateUserView(user));

    // 4. Subscribe on scoreboard changed. https://firebase.google.com/docs/database/web/read-and-write#listen_for_value_events
    // 5. Limit scoreboard to 10 top records. https://firebase.google.com/docs/database/web/lists-of-data#sort_data
    firebase.database().ref('/scoreboard/').orderByValue().limitToLast(10).on('value', function (snapshot) {
       // console.log(snapshot.val());
        updateScoreboard(snapshot.val());
    });

    // 6. Add index in console. https://firebase.google.com/docs/database/security/indexing-data#section-indexing-order-by-value  

    updateEmHandlers();
}

function startLevel(level) {
    levelIndex = level % 4;
    stopWordsFound = 0;
    misses = 0;
    // 7. Get level text from levels/{levelIndex}. Without subscription!!! https://firebase.google.com/docs/database/web/read-and-write#read_data_once
    firebase.database().ref('/levels/' + levelIndex).once('value').then(function (snapshot) {
        setMainText(snapshot.val().text);
    });
    setMainText("{Некоторый} текст");

	$(".main-button").show();
	$(".go-button").html("Ещё!").hide();
}

function finishLevel() {
    $(".go-button").show();
    $(".main-button").hide();
    setMainText("<em>Вроде бы</em> повержено стоп-слов — " + stopWordsFound + ". <em>При этом, к сожалению,</em> промахов — " + misses + ".");

    // 8. Send scores! (Read score then write score + stopWordsFound). https://firebase.google.com/docs/database/web/read-and-write#basic_write
    let userName = firebase.auth().currentUser.displayName;
    let dbReference = firebase.database().ref('/scoreboard/' + userName);
    dbReference.once('value')
        .then(function (snapshot) {
            let currentScore = snapshot.val();
            dbReference.set(currentScore + stopWordsFound)
                .catch(e => `error while setting ${currentScore} + ${stopWordsFound} to user ${userName}: ${e.message}`);
        })
        .catch(e => `error while reading current score of user ${userName}: ${e.message}`);

    updateEmHandlers();
}

// Other stuff. No more tasks below...

function updateUserView(user) {
    console.log(`updating view with user ${user ? user.displayName : ''}`);
    $(".username").html(user ? user.displayName : "anonymous");
    $(".userpic").attr("src", user ? user.photoURL : "//placehold.it/30x30");
}

function updateScoreboard(scores) {
    // scores = { 'name' : 12, 'name2' : 42 }
    console.log(scores);
    var lines =
        Object.keys(scores)
        .sort((k1, k2) => scores[k2] - scores[k1])
        .map(name => "<tr><td>" + name + "</td><td>" + scores[name] + "</td></tr>")
        .join("\r\n");
    $(".scoreboard-body").html(lines);
}

function clickText(e) {
    var target = $(e.target);
    if (target.hasClass("stop-word")) {
        markFoundStopWord(target);
        stopWordsFound++;
    } else misses++;
}

function setMainText(text) {
    var textElement = $(".main");
    textElement.html(convertToHtml(text));
    textElement.css({ display: text ? "block" : "none" });
}

function convertToHtml(text, className) {
    return text.replace(/\{(.+?)\}/g, (s, a) => "<span class='stop-word'>" + a + "</span>");
}

function goNext() {
    startLevel(levelIndex + 1);
}

function markFoundStopWord($el) {
    $el
        .removeClass("stop-word")
        .addClass("found-stop-word")
        .addClass("shake");
}

function updateEmHandlers() {
    $('em').click(function() { markFoundStopWord($(this)); });
}
