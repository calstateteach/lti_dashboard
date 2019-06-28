# Dashboard LTI for CalStateTEACH Canvas Users

This Web-based dashboard app gives [CalStateTeach](https://www.calstateteach.net/) users of [Canvas](https://www.canvaslms.com/) a summary view of their data across multiple courses, with links to relevant Canvas pages for reviewing assignment submissions. It also simplifies the process of creating assignments & displays data from other services used by CalStateTEACH. Students can use it to create Google Docs automatically populated with their assignment data. It is made available as an example of using the [Canvas API](https://canvas.instructure.com/doc/api/index.html) to completely tailor the user experience for Canvas users. The app was demoed for the [February 2018 Canvas CIG online meeting](https://community.canvaslms.com/docs/DOC-16226-february-2018-canvas-cig-zoom-share-agendanotes) & will be discussed in a [session](https://events.bizzabo.com/211400/agenda/session/78382) at [InstructureCon 2019](https://blog.canvaslms.com/news/instructurecon19).

### Dependencies

The Web app uses the [Express](https://expressjs.com/) framework for [Node.js](https://nodejs.org/). [MongoDB](https://www.mongodb.com/) is used as a session database & to store dashboard settings per user. Besides using the Canvas API, the app calls proprietary 3rd party Web services.

### Configuration

Configuration files are in the *config/* folder. Configuration strings retrieved from the runtime environment are specified in the *.env* file.

## Deployment

In production, the Web app runs on an [Amazon EC2](https://aws.amazon.com/ec2/) instance running Ubuntu.


## Authors

* **Terence Shek** - *Programmer* - [tpshek](https://github.com/tpshek/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
