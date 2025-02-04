async function sha512Hash(string) {
    return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(string)).then(buf => {
        return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
    });
}

function secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const redColor = "#ad0b0b";
const yellowColor = "#a7a70b";
const greenColor = "#0ba70b";

function hexToRgb(hex) {
    hex = hex.replace("#", "");
    return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16)
    ];
}

function rgbToHex(rgb) {
    return "#" + rgb.map(value => value.toString(16).padStart(2, "0")).join("");
}

function interpolateColor(color1, color2, factor) {
    return color1.map((val, i) => Math.round(val + factor * (color2[i] - val)));
}

function getColorForScore(score) {
    if (score <= 0) return redColor;
    if (score >= 100) return greenColor;

    const redRGB = hexToRgb(redColor);
    const yellowRGB = hexToRgb(yellowColor);
    const greenRGB = hexToRgb(greenColor);

    if (score <= 50) {
        const factor = score / 50;
        return rgbToHex(interpolateColor(redRGB, yellowRGB, factor));
    } else {
        const factor = (score - 50) / 50;
        return rgbToHex(interpolateColor(yellowRGB, greenRGB, factor));
    }
}

async function fetchAPI(method, params, apiKey, apiSecret) {
    let url = `https://codeforces.com/api/${method}?` + params.map(p => `${Object.keys(p)[0]}=${Object.values(p)[0]}`).join('&');
    if (apiKey && apiSecret) {
        const time = Math.floor(Date.now() / 1000);
        const rand = Math.floor(Math.random() * (10 ** 6 - 10 ** 5 - 1)) + 10 ** 5;
        params.push({ apiKey });
        params.push({ time });
        params.sort((a, b) => Object.keys(a)[0].localeCompare(Object.keys(b)[0]));
        const hash = await sha512Hash(`${rand}/${method}?` + params.map(p => `${Object.keys(p)[0]}=${Object.values(p)[0]}`).join('&') + '#' + apiSecret);
        url += `&apiKey=${apiKey}&time=${time}&apiSig=${rand}${hash}`;
    }

    // console.log("Fetching", url);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    const { status, result, comment } = await response.json();

    if (status != "OK") {
        throw new Error(`Codeforces API error: ${comment}`);
    }

    // console.log("Fetched", result);

    return result;
}

let standings = [];
const problemIndex = {};
let currentIndex = 0;

async function fetchContest() {
    const contestId = document.getElementById("contestId").value;
    const apiKey = document.getElementById("apiKey").value;
    const apiSecret = document.getElementById("apiSecret").value;

    if (!contestId) {
        alert("Please enter a contest ID");
        return;
    }

    document.getElementById("title").style.display = "none";
    document.getElementById("input-container").style.display = "none";
    document.getElementById("header").style.display = "flex";
    document.getElementById("standings").style.display = "block";

    const { contest, problems, rows } = await fetchAPI('contest.standings', [{ contestId }, { asManager: true }], apiKey, apiSecret);
    let submissions = await fetchAPI('contest.status', [{ contestId }, { asManager: true }], apiKey, apiSecret);
    submissions = submissions.filter(submission => submission.author.participantType == "CONTESTANT");

    problems.forEach((problem, index) => {
        problemIndex[problem.index] = index;
    });

    const standingsContainer = document.getElementById('standings');

    standings = rows.map(user => {
        const userSubmissions = submissions.filter(submission => submission.author.members[0].handle == user.party.members[0].handle);
        const userProblems = problems.map(problem => {
            const userProblemSubmissions = userSubmissions.filter(submission => submission.problem.index == problem.index);
            userProblemSubmissions.sort((a, b) => a.relativeTimeSeconds - b.relativeTimeSeconds);
            const data = {
                index: problem.index,
                beforeFreeze: null,
                afterFreeze: null,
            }

            for (const submission of userProblemSubmissions) {
                if (!contest.freezeDurationSeconds || submission.relativeTimeSeconds < contest.durationSeconds - contest.freezeDurationSeconds) {
                    if (data.beforeFreeze == null) {
                        if (submission.points > 0) {
                            data.beforeFreeze = [submission.points, submission.relativeTimeSeconds];
                        } else {
                            data.beforeFreeze = [0, 0];
                        }
                    } else {
                        if (submission.points > data.beforeFreeze[0]) {
                            data.beforeFreeze = [submission.points, submission.relativeTimeSeconds];
                        }
                    }
                } else {
                    if (data.afterFreeze == null) {
                        if (submission.points > 0) {
                            data.afterFreeze = [submission.points, submission.relativeTimeSeconds];
                        } else {
                            data.afterFreeze = [0, 0];
                        }
                    } else {
                        if (submission.points > data.afterFreeze[0]) {
                            data.afterFreeze = [submission.points, submission.relativeTimeSeconds];
                        }
                    }
                }
            }

            return data;
        });

        const totalScore = userProblems.reduce((acc, problem) => {
            if (problem.beforeFreeze) {
                acc += problem.beforeFreeze[0];
            }

            return acc;
        }, 0);

        const totalTime = userProblems.reduce((acc, problem) => {
            if (problem.beforeFreeze) {
                acc += problem.beforeFreeze[1];
            }

            return acc;
        }, 0);

        return {
            rank: 0,
            handle: user.party.members[0].name || user.party.members[0].handle,
            problems: userProblems,
            totalScore,
            totalTime,
            currentTop: 0,
        };
    });

    standings.sort((a, b) => {
        if (a.totalScore != b.totalScore) {
            return b.totalScore - a.totalScore;
        }

        return a.totalTime - b.totalTime;
    });

    standings[0].rank = 1;
    for (let i = 1; i < standings.length; i++) {
        if (standings[i].totalScore == standings[i - 1].totalScore && standings[i].totalTime == standings[i - 1].totalTime) {
            standings[i].rank = standings[i - 1].rank;
        } else {
            standings[i].rank = i + 1;
        }
    }

    currentIndex = standings.length - 1;

    standings.forEach((user, index) => {
        const rankBox = document.createElement('div');
        rankBox.classList.add('rank-box');

        const rankDiv = document.createElement('div');
        rankDiv.classList.add('rank');
        rankDiv.textContent = user.rank;

        const userInfoDiv = document.createElement("div");
        userInfoDiv.classList.add("user-info");

        const handleDiv = document.createElement("div");
        handleDiv.classList.add("handle");
        handleDiv.textContent = user.handle;

        const problemPointsDiv = document.createElement("div");
        problemPointsDiv.classList.add("problem-points");

        user.problems.forEach(problem => {
            const pointBox = document.createElement("div");
            pointBox.classList.add("point-box");
            pointBox.textContent = problem.beforeFreeze ? `${problem.beforeFreeze[0]} - ${secondsToDuration(problem.beforeFreeze[1])}` : problem.index;
            if (problem.afterFreeze) {
                pointBox.style.background = "gray";
                pointBox.style.color = "#ffffff";
            } else if (problem.beforeFreeze) {
                pointBox.style.background = getColorForScore(problem.beforeFreeze[0])
                pointBox.style.color = "#ffffff";
            } else {
                pointBox.style.background = "#282828";
                pointBox.style.color = "##646464";
            }
            problemPointsDiv.appendChild(pointBox);
        });

        userInfoDiv.appendChild(handleDiv);
        userInfoDiv.appendChild(problemPointsDiv);

        const totalScoreDiv = document.createElement("div");
        totalScoreDiv.classList.add("total-score");
        totalScoreDiv.textContent = user.totalScore;

        const totalTimeDiv = document.createElement("div");
        totalTimeDiv.classList.add("total-time");
        totalTimeDiv.textContent = secondsToDuration(user.totalTime);

        rankBox.appendChild(rankDiv);
        rankBox.appendChild(userInfoDiv);
        rankBox.appendChild(totalScoreDiv);
        rankBox.appendChild(totalTimeDiv);

        standingsContainer.appendChild(rankBox);
    });
}

let currentAction = 0; // 0: Next user, 1: Next unfrozen problem, 2: Open unfrozen problem
const transitionStyle = "top 1s ease-in-out";

function getBoxByHandle(handle) {
    const rankBoxes = document.querySelectorAll(".rank-box");
    for (let i = 0; i < rankBoxes.length; i++) {
        if (rankBoxes[i].querySelector(".handle").textContent == handle) {
            return rankBoxes[i];
        }
    }

    return null;
}

let processDone = true;

document.addEventListener("keydown", function (event) {
    if (!processDone) {
        return;
    }

    if (event.key == 'n') {
        processDone = false;

        const scrollToBox = document.querySelectorAll(`.rank-box`)[Math.min(currentIndex + 1, standings.length - 1)];
        scrollToBox.scrollIntoView({ behavior: "smooth", block: "end" });

        if (currentAction == 0) {
            if (currentIndex < standings.length - 1) {
                const previousBox = document.querySelectorAll(`.rank-box`)[currentIndex + 1];
                previousBox.style.background = "transparent";
            }

            if (currentIndex == -1) {
                return;
            }

            const unfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.afterFreeze);
            const currentBox = document.querySelectorAll(`.rank-box`)[currentIndex];
            currentBox.style.background = "#5782d9";

            if (unfrozenIndex == -1) {
                currentIndex--;
            } else {
                currentAction = 1;
            }

            processDone = true;
        } else if (currentAction == 1) {
            const unfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.afterFreeze);
            if (unfrozenIndex == -1) {
                currentAction = 0;
                currentIndex--;
            } else {
                const currentProblem = standings[currentIndex].problems[unfrozenIndex];
                const currentBox = document.querySelectorAll(`.rank-box`)[currentIndex];
                const problemPointsDiv = currentBox.querySelector(".problem-points");
                const problemBox = problemPointsDiv.children[problemIndex[currentProblem.index]];
                problemBox.style.borderColor = "lightgray";
                currentAction = 2;
            }

            processDone = true;
        } else if (currentAction == 2) {
            const unfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.afterFreeze);
            const currentProblem = standings[currentIndex].problems[unfrozenIndex];
            const currentBox = document.querySelectorAll(`.rank-box`)[currentIndex];
            const problemPointsDiv = currentBox.querySelector(".problem-points");
            const problemBox = problemPointsDiv.children[problemIndex[currentProblem.index]];
            const totalScoreDiv = currentBox.querySelector(".total-score");
            const totalTimeDiv = currentBox.querySelector(".total-time");
            if (!currentProblem.beforeFreeze || currentProblem.beforeFreeze[0] < currentProblem.afterFreeze[0]) {
                problemBox.textContent = `${currentProblem.afterFreeze[0]} - ${secondsToDuration(currentProblem.afterFreeze[1])}`;
                problemBox.style.background = getColorForScore(currentProblem.afterFreeze[0]);
                problemBox.style.color = "#ffffff";
                standings[currentIndex].totalScore += -(currentProblem.beforeFreeze ? currentProblem.beforeFreeze[0] : 0) + currentProblem.afterFreeze[0];
                totalScoreDiv.textContent = standings[currentIndex].totalScore;
                standings[currentIndex].totalTime += -(currentProblem.beforeFreeze ? currentProblem.beforeFreeze[1] : 0) + currentProblem.afterFreeze[1];
                totalTimeDiv.textContent = secondsToDuration(standings[currentIndex].totalTime);
            } else {
                problemBox.style.background = getColorForScore(currentProblem.beforeFreeze[0]);
            }
            currentProblem.afterFreeze = null;
            problemBox.style.borderColor = "transparent";

            let newIndex = currentIndex;
            for (let i = currentIndex; i >= 0; i--) {
                if (standings[currentIndex].totalScore > standings[i].totalScore || (standings[currentIndex].totalScore == standings[i].totalScore && standings[currentIndex].totalTime < standings[i].totalTime)) {
                    newIndex = i;
                }
            }

            const user = standings.splice(currentIndex, 1)[0];
            standings.splice(newIndex, 0, user);

            for (let i = newIndex; i < standings.length; i++) {
                if (i == 0) {
                    standings[i].rank = 1;
                } else {
                    if (standings[i].totalScore == standings[i - 1].totalScore && standings[i].totalTime == standings[i - 1].totalTime) {
                        standings[i].rank = standings[i - 1].rank;
                    } else {
                        standings[i].rank = i + 1;
                    }
                }

                const rankBox = getBoxByHandle(standings[i].handle);
                rankBox.querySelector(".rank").textContent = standings[i].rank;
            }

            if (newIndex != currentIndex) {
                currentBox.style.transition = transitionStyle;
                currentBox.style.top = `${90 * (newIndex - currentIndex)}px`;
                for (let i = currentIndex - 1; i >= newIndex; i--) {
                    const box = document.querySelectorAll(`.rank-box`)[i];
                    box.style.transition = transitionStyle;
                    box.style.top = "90px";
                }

                setTimeout(() => {
                    const rankContainer = document.getElementById('standings');
                    rankContainer.insertBefore(currentBox, rankContainer.children[newIndex]);
                    for (let i = currentIndex; i >= newIndex; i--) {
                        const box = document.querySelectorAll(`.rank-box`)[i];
                        box.style.transition = "none";
                        box.style.top = "";
                    }

                    document.querySelectorAll(`.rank-box`)[newIndex].style.background = "transparent"
                    document.querySelectorAll(`.rank-box`)[currentIndex].style.background = "#5782d9";

                    const nextUnfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.afterFreeze);
                    if (nextUnfrozenIndex == -1) {
                        currentIndex--;
                        currentAction = 0;
                    } else {
                        currentAction = 1;
                    }

                    processDone = true;
                }, 1000);
            } else {
                const nextUnfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.afterFreeze);
                if (nextUnfrozenIndex == -1) {
                    currentIndex--;
                    currentAction = 0;
                } else {
                    currentAction = 1;
                }

                processDone = true;
            }
        }
    }
});