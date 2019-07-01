# Dashboard LTI for CalStateTEACH Canvas Users

This Web-based dashboard app gives [CalStateTeach](https://www.calstateteach.net/) users of [Canvas](https://www.canvaslms.com/) a summary view of their data across multiple courses, with links to relevant Canvas pages for reviewing assignment submissions. It also simplifies the process of creating assignments & displays data from other services used by CalStateTEACH. Features include:

* Live summaries of status of student submissions, across multiple courses.
* Direct links to Canvas app's assignment pages, submissions pages, student information & SpeedGrader.
* Simplified creation of Canvas assignments linked to external tools.
* Automated creation of Google Docs populated with Canvas assignment data.
* Periodic background fetching of Canvas data, to maintain responsiveness of the UI.
* LTI administrator's interface for monitoring the configuration & status of the app.
 
This project is made available as an example of using the [Canvas API](https://canvas.instructure.com/doc/api/index.html) to completely tailor the user experience for Canvas users. The app was demoed for the [February 2018 Canvas CIG online meeting](https://community.canvaslms.com/docs/DOC-16226-february-2018-canvas-cig-zoom-share-agendanotes) & will be discussed in a [session](https://events.bizzabo.com/211400/agenda/session/78382) at [InstructureCon 2019](https://blog.canvaslms.com/news/instructurecon19).

### Dependencies

The Web app uses the [Express](https://expressjs.com/) framework for [Node.js](https://nodejs.org/). [MongoDB](https://www.mongodb.com/) is used as a session database & a store for dashboard user settings. Besides using the Canvas API, the app calls proprietary 3rd party Web services.

### Configuration

Configuration files are in the *config/* folder. Configuration strings retrieved from the runtime environment are specified in the *.env* file.

### Web App Entry Points

The LTI is expected to be entered by an LTI launch request using OAuth, which in production is a POST request from the Canvas app. The launch URL is the route */lti* in the root of the Web app. 

There is also a */devlogin* route in the root of the Web app for LTI admins. This route requires a user ID & password to enter & gives access to developer & admin pages.

The project's *routes* & *views* folders contain these subfolders:

* *dash/* for pages accessed by LTI users.
* *dev/* for pages accessed by LTI admins/developers.
 * *root/* for entry points.

## Deployment

In production, the Web app runs on an [Amazon EC2](https://aws.amazon.com/ec2/) instance running Ubuntu.


## Authors

* **Terence Shek** - *Programmer* - [tpshek](https://github.com/tpshek/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
