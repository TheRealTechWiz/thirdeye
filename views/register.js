const changeBtn = document.getElementById('change');
const heading = document.querySelector('.loginbox h1');
const changeText = document.querySelector('.loginbox a');
const role = document.querySelector('.loginbox #role');
const username = document.querySelector('.loginbox #username');
const rollno = document.querySelector('.loginbox #rollno');
const head = document.querySelector('.loginbox #head');
const studentField = document.querySelector('.loginbox #student');
const teacherField = document.querySelector('.loginbox #teacher');
const passwordField = document.querySelector('.loginbox #password');
const subBtn = document.querySelector('.loginbox #sub');

let isStudent = true;

// on change buton click change heading to 'Register as Teacher'
changeBtn.addEventListener('click', () => {
    if (isStudent) {
        username.required = true;
        rollno.required = false;        
        studentField.style.display = 'none';
        teacherField.style.display = 'block';
        heading.innerHTML = 'Register as Teacher';
        changeText.innerHTML = 'Register as Student';
        head.innerHTML = 'Username';
        role.value = 'teacher';
        isStudent = false;
    }
    else{
        username.required = false;
        rollno.required = true;    
        studentField.style.display = 'flex';
        teacherField.style.display = 'none';
        heading.innerHTML = 'Register as Student';
        changeText.innerHTML = 'Register as Teacher';
        head.innerHTML = 'Rollno.';
        role.value = 'student';
        isStudent = true;
    }
}
);
