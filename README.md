# OI Standings Resolver

The OI Standings Resolver is a tool designed to simulate the frozen period of an OI-style contest, revealing the final submissions' results in an interesting way before displaying the final standings. The concept and design are inspired by the [official ICPC Resolver](https://tools.icpc.global/resolver/) and [neoSaris - ICPC Standings Resolver](https://github.com/huronOS/neoSaris).

![demo](/img/demo.png)

Unlike ICPC-style contests, OI-style contests use partial scoring, where each problem may have multiple subtasks, and contestants receive a score based on the number of test cases or subtasks they solve. Then, the contestants are ranked by their total score in descending order. If there is a tie, contestants are ranked by the total time in ascending order. The total time is the sum of time consumed for each problem. The time consumed for a problem is the time elapsed from the start of the contest until the first highest positive score submission plus a penalty (usually 0 or 20 minutes) for each submission before that.

## Usage

### Open the tool

You can access the tool at [oi-resolver.netlify.app](https://oi-resolver.netlify.app) or [kitsunehivern.github.io/OI-Resolver](https://kitsunehivern.github.io/OI-Resolver). You can either use it online or clone the repository and open the `index.html` file in your browser.

### Prepare the data

You can choose between two ways to input the data:

#### Raw JSON

The input JSON should have the format as the following example:

```json
{
  "contest": {
    "name": "Blue Contest",
    "durationMinutes": 60,
    "freezeDurationMinutes": 30,
    "penaltyMinutes": 20
  },
  "problems": [
    {
      "index": "A",
      "points": 100
    }
  ],
  "contestants": [
    {
      "name": "Kitsune",
      "logo": "img/sensei.png"
    },
    {
      "name": "Hoshino",
      "logo": "img/hoshino.png"
    },
    {
      "name": "Hina",
      "logo": "img/hina.png"
    }
  ],
  "submissions": [
    {
      "name": "Kitsune",
      "problemIndex": "A",
      "submitMinutes": 10,
      "points": 30
    },
    {
      "name": "Hina",
      "problemIndex": "A",
      "submitMinutes": 20,
      "points": 50
    },
    {
      "name": "Hoshino",
      "problemIndex": "A",
      "submitMinutes": 30,
      "points": 70
    },
    {
      "name": "Kitsune",
      "problemIndex": "A",
      "submitMinutes": 50,
      "points": 100
    }
  ]
}
```

Explanation:
- `contest`: The information of the contest.
    - `contest.name`: The name of the contest.
    - `contest.durationMinutes`: The duration of the contest in minutes.
    - `contest.freezeDurationMinutes`: The duration of the frozen period in minutes.
    - `contest.penaltyMinutes`: The penalty in minutes for each submission before the first highest positive score submission for each problem.
- `problems`: The information of the problems.
    - `problems.index`: The index of the problem.
    - `problems.points`: The maximum points for the problem.
- `contestants`: The information of the contestants.
    - `contestants.name`: The name of the contestant.
    - `contestants.logo` (*optional*): The path to the logo of the contestant.
- `submissions`: The information of the submissions.
    - `submissions.name`: The name of the contestant.
    - `submissions.problemIndex`: The index of the problem.
    - `submissions.submitMinutes`: The time elapsed from the start of the contest until the submission in minutes.
    - `submissions.points`: The score of the submission.

**Make sure the `submissions` array is sorted in ascending order based on the submit time (measured in seconds)**.

Interestingly, if the data is set up correctly, the tool can also be used for ICPC-style contests.

#### Codeforces contest

You can only use this for Codeforces contests where **you are the manager**. You need to provide the contest ID along with your API key and secret from the [Codeforces API](https://codeforces.com/settings/api). After you input the data, the tool will fetch contest data and convert it into the above JSON format. It supports both OI and ICPC-style contests.

When using the Codeforces API, the maximum points for each problem are not included in the response for private contests. The tool will set it to 100 for OI-style contests and 1 for ICPC-style contests. You can manually change it in the JSON data if needed.

### Control the resolver

If you successfully click the submit button, a splash screen will appear. Press `Enter` to start the resolver. Then, you can use the following keys:
- Press `N` to move to the **N**ext submission.
- Press `A` to **A**uto-play the resolver.
- Press `R` to **R**eset the resolver.

## Notes

- The tool is designed to be used on a desktop or laptop. It may not work well on mobile devices.

- If there are many problems, the content of the point box may overflow. You can try zooming out the page to fix this.

- If smooth scrolling is not working, enable it in the browser settings (e.g. `chrome://flags/#smooth-scrolling`).

- If the contestant's logo is not displayed, make sure the path is correct, or try pressing `R` to reset the resolver.

## Contributing

If you find any bugs or have any suggestions, feel free to open an issue or a pull request.
