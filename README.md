# Instructure Canvas API Utilities
## Description
  Canvas by Instructure is a widely adopted Learning Management System (LMS) across the US. It offers a REST API to the educators who want to create their own ways to solve problems. The project utilizes this API to extend the functionality of Canvas.
## Usage

<a href=https://canvas-api-utility.manifold1985.repl.co target=_blank>A Demo on Replit: </a>
This is a web-based application. No installation is needed. Use the link to access the application hosted on Replit.com.

---
### Login
![Login page](https://github.com/benhuangbmj/canvasApiUtility/blob/826532012c1de939d65b57601614c6b8df8e39db/img/Login.png)

You need an access token to use the Canvas API. See the following instruction on how to get your access token.

[Manual Token Generation](https://canvas.instructure.com/doc/api/file.oauth.html#manual-token-generation)

Once you generate your access code, copy and paste it to the **Access Token** blank, and select the proper **Environment**, then click **Submit**.

### Profile
If you log in successfuly, you will be led to the **Profile** page.
![Profile page](https://github.com/benhuangbmj/canvasApiUtility/blob/826532012c1de939d65b57601614c6b8df8e39db/img/profile.PNG)
- To use a service, select the subjects that you want to apply the service to, then click the **Deliver** button.
- To subscrib to the periodical service, select the subjects, check the **Subscribe** checkbox, then click the **Submit** button.

### Services
- Check Overdue: Send a remainder to each student who has an overdue assignment, with a countdown to the last day of assignment availability.
- Sync Grades: Synchonize the grades all assignments from source course to the target course. If the assignment doesn't exist yet in the target source, a clone will be created automatically.
- Assign Grades (*Demo*): Assign grades to the target assignments according to the specified formula. *As of now, a random score will be assigned.*
- Create Peer Graded: Create an assignment with the designated name under the designated group. Meanwhile, a batch of peer feedback surveys will be generated, each of which is assigned to the entire class except for the student being reviewed. All the generated surveys will be placed under the *Unprocessed* group (if the group doesn't exist yet, it will be created.)
- Process Peer Graded: Process the peer feedbacks past the last day of survey availability. The average of the scores will be calculated and assigned to the assignment of the student being reviewed, and the feedback comments will be sent to the student non-anoymously.<br /> 
(*Remark: the servie of **Create Peer Graded** and **Process Peer Graded** must be used in tandem for the application to recognize the assignments properly.*)