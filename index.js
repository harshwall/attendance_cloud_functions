const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
// exports.helloWorld = functions.database.ref('notification/{id}').onWrite(



//function to automatically add students to a subject when teacher creates a subject
exports.addStudentsToSubject = functions.firestore.document('teach/{paramTeachDoc}/subject/{paramSubjectTeachDoc}').onCreate(async (docSnapshot,context) => {
    
    // console.log(context.params.paramTeachDoc);
    var teachDoc=context.params.paramTeachDoc;
    var teachDocData;
    var teacherId;


    //docSnapshot has subject added by  teacher
    var teachSubjectId=docSnapshot.id;
    var subjectTeachDocData=docSnapshot.data();
    var classId=subjectTeachDocData['classId'];
    var subjectId=subjectTeachDocData['subjectId'];
    var subjectName=subjectTeachDocData['subjectName'];
    var studSubjectData=null;
    //get data of teacher
    
    var temp=await admin.firestore().collection('teach').doc(teachDoc).get();
    teachDocData=temp.data();
    teacherId=teachDocData['teacherId'];
    // console.log(teachDocData);
    // console.log(classId,subjectId,subjectName);
    // console.log(teacherId);
    var allStudents=await admin.firestore().collection('stud').where('classId','==',classId).where('verify','==',1).get();
    // .then((allStudents) => {
    allStudents.forEach((studDoc) => {
    	var studSubjectData={
    		'subjectName':subjectName,
    		'subjectId':subjectId,
    		'teacherId':teacherId,
    		'absent':'0',
    		'present':'0'
    	};
    	admin.firestore().collection('stud').doc(studDoc.id).collection('subject').add(studSubjectData);
    });
    // console.log('Added subject in students');
    allStudents.forEach((studDoc) => {
    	admin.firestore().collection('teach').doc(temp.id).collection('subject').doc(teachSubjectId).collection('studentsEnrolled').add({'docId':studDoc.id});
    });
    // console.log('Added students in subject');
    return null;

    
});

//function to automatically structure classes
exports.addnewclass = functions.firestore.document('stud/{paramStudent}').onCreate(async (docSnapshot,context) => {
	// console.log(context.params.paramStudent);
    var studentDoc=context.params.paramStudent;
    var studentDocData=docSnapshot.data();
    var temp=await admin.firestore().collection('classes').where('classId','==',studentDocData['classId']).get();
    if(temp.size===0)
    	await admin.firestore().collection('classes').add({'classId':studentDocData['classId']});
    return null;
});


//function to structure subjects in classes
exports.addnewsubject = functions.firestore.document('teach/{paramTeacher}/subject/{paramSubject}').onCreate(async (docSnapshot,context) => {
	// console.log(context.params.paramTeacher);
	var teacherDoc;
	var subjectDocData=docSnapshot.data();
	var temp=await admin.firestore().collection('classes').where('classId','==',subjectDocData['classId']).get();
	temp.forEach((classId) => {
    	admin.firestore().collection('classes').doc(classId.id).collection('subject').add({'subjectId':subjectDocData['subjectId'],'subjectName':subjectDocData['subjectName']});
	});
	return null;
});


//function to automatically count attendance of a student
exports.attendanceAdded = functions.firestore.document('stud/{paramStudent}/subject/{paramSubject}/attendance/{paramAttendance}').onCreate(async (docSnapshot,context) => {
	// console.log(context.params.paramStudent);
	var studentDocId=context.params.paramStudent;
    var subjectDocId=context.params.paramSubject;
    var attendanceDocData=docSnapshot.data();

    var subjectDoc=await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).get();
    var subjectDocData=subjectDoc.data();
    var present=parseInt(subjectDocData['present']);
    var absent=parseInt(subjectDocData['absent']);
    if(attendanceDocData['outcome']==='P')
    	present=present+parseInt(attendanceDocData['duration']);
    else
    	absent=absent+parseInt(attendanceDocData['duration']);

    await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).update({'present':present.toString()});
    await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).update({'absent':absent.toString()});

    return null;
});


//function automatically update attendance of a student
exports.attendanceUpdated = functions.firestore.document('stud/{paramStudent}/subject/{paramSubject}/attendance/{paramAttendance}').onUpdate(async (docSnapshot,context) => {
	// console.log(context.params.paramStudent);
	var studentDocId=context.params.paramStudent;
    var subjectDocId=context.params.paramSubject;

    var subjectDoc=await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).get();
    var subjectDocData=subjectDoc.data();
    var present=parseInt(subjectDocData['present']);
    var absent=parseInt(subjectDocData['absent']);


    var earlierAttendanceDocData=docSnapshot.before.data();
    var laterAttendanceDocData=docSnapshot.after.data();
    if(earlierAttendanceDocData['outcome']==='A' && laterAttendanceDocData['outcome']==='P'){
    	absent=absent-parseInt(earlierAttendanceDocData['duration']);
    	present=present+parseInt(laterAttendanceDocData['duration']);
    }
    else if(earlierAttendanceDocData['outcome']==='P' && laterAttendanceDocData['outcome']==='A'){
    	present=present-parseInt(earlierAttendanceDocData['duration']);
    	absent=absent+parseInt(laterAttendanceDocData['duration'])
    }

    await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).update({'present':present.toString()});
    await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).update({'absent':absent.toString()});

    return null;
});

//function to allow a student whose attendancce is below 75%
exports.allowStudent = functions.firestore.document('allow/{paramStudentInSubject}').onCreate(async (docSnapshot,context) => {
    // console.log(context.params.paramStudentInSubject);
    var allowDocData=docSnapshot.data();
    var allowDocId=docSnapshot.id;
    var subjectId=allowDocData['subjectId'];
    var teacherId=allowDocData['teacherId'];
    var studentRegNo=allowDocData['regNo'];
    var studentDoc=await admin.firestore().collection('stud').where('regNo','==',studentRegNo).get();
    if(studentDoc.size===0)
        return null;
    var studentDocData;
    var studentDocId;

    //this loop will run only once
    studentDoc.forEach((studDoc) => {
        // console.log(studDoc);
        studentDocData=studDoc.data();
        studentDocId=studDoc.id;
        return true;
    });

    var subjectDoc=await admin.firestore().collection('stud').doc(studentDocId).collection('subject').where('subjectId','==',subjectId).where('teacherId','==',teacherId).get();
    if(subjectDoc.size===0)
        return null;
    var present=0;
    var absent=0;
    var subjectDocId;
    var subjectDocData;

    //this loop will run only once
    subjectDoc.forEach((subDoc) => {
        // console.log(subDoc);
        subjectDocData=subDoc.data();
        subjectDocId=subDoc.id;
        present=parseInt(subjectDocData['present']);
        absent=parseInt(subjectDocData['absent']);
        return true;
    });


    var total=present+absent;
    var extraPresentRequired=Math.ceil(((total)*0.75)-present);
    if(extraPresentRequired<0)
        extraPresentRequired=0;

    var attendanceDoc=await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).collection('attendance').where('outcome','==','A').get();
    attendanceDoc.forEach((attDoc) => {
        // console.log(attDoc);
        var attendanceDocId=attDoc.id;
        var attendanceDocData=attDoc.data();
        //this line breaks the forEach loop
        if(extraPresentRequired<=0)
            return true;
        extraPresentRequired=extraPresentRequired-parseInt(attendanceDocData['duration']);
        admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).collection('attendance').doc(attendanceDocId).update({'outcome':'P'});
    });

    admin.firestore().collection('allow').doc(allowDocId).delete();
    admin.firestore().collection('check').add({'studentDocId':studentDocId,'subjectDocId':subjectDocId});
    return null;
});

exports.checkStudentAttendance = functions.firestore.document('check/{paramStudentInSubject}').onCreate(async (docSnapshot,context) => {
    // console.log(context.params.paramStudentInSubject);
    var checkDocData=docSnapshot.data();
    var checkDocId=docSnapshot.id;
    var subjectDocId=checkDocData['subjectDocId'];
    var studentDocId=checkDocData['studentDocId'];

    var earlierPresent=0;
    var earlierAbsent=0;
    var subjectDoc=await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).get();
    var subjectDocData=subjectDoc.data();
    earlierPresent=parseInt(subjectDocData['present']);
    earlierAbsent=parseInt(subjectDocData['absent']);

    var start=new Date().getTime();
    while(new Date().getTime()<(start+5000));

    var attendanceDoc=await admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).collection('attendance').get();
    var currentPresent=0;
    var currentAbsent=0;
    var attendanceDocData;
    var duration=0;
    attendanceDoc.forEach((attDoc) => {
        // console.log(attDoc);
        attendanceDocData=attDoc.data();
        duration=parseInt(attendanceDocData['duration']);
        //this line breaks the forEach loop
        if(attendanceDocData['outcome']==='P')
            currentPresent=currentPresent+duration;
        else
            currentAbsent=currentAbsent+duration;
        // extraPresentRequired=extraPresentRequired-attendanceDocData['duration'];
        // admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).collection('attendance').doc(attendanceDocId).update({'outcome':'P'});
    });

    admin.firestore().collection('check').doc(checkDocId).delete();

    if(earlierPresent===currentPresent && earlierAbsent===currentAbsent)
        return null;
    admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).update({'present':currentPresent.toString()});
    admin.firestore().collection('stud').doc(studentDocId).collection('subject').doc(subjectDocId).update({'absent':currentAbsent.toString()});
    admin.firestore().collection('check').add({'studentDocId':studentDocId,'subjectDocId':subjectDocId});
    return null;
});