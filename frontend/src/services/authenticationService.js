import {BehaviorSubject} from "rxjs"
import axios from 'axios';
import history from '../Components/history'
import Cookies from 'universal-cookie';
import {getNameService as getNameSvc} from './getNameService';
import {getImageService as getImgSvc} from './getImageService';
const currentUserSubject = new BehaviorSubject(JSON.parse(localStorage.getItem('currentUser')));
//const loggedIn = new BehaviorSubject(false);

export const authenticationService = {
    login,
    logout,
    getUsernameFromJWT,
    verifyLogin,
    loggedIn: localStorage.getItem('currentUser') ? true: false,
    currentUser: currentUserSubject.asObservable(),
    get currentUserValue() { return currentUserSubject.value}
}

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function getUsernameFromJWT() {
    const user = JSON.parse(localStorage.getItem('currentUser')).token;
    return parseJwt(user).sub;
}

async function verifyLogin() {

      const cookies = new Cookies();
      const user = JSON.parse(localStorage.getItem("currentUser"));
      var response = null;
      //console.log(user);
      console.log("verifyLogin", user);
      if (user) {
        const decodedJwt = parseJwt(user.token);
        console.log("Decoded JWT", decodedJwt);
        if (decodedJwt.exp * 1000 < Date.now()) {
          localStorage.removeItem('currentUser');
          const username = decodedJwt.sub;
          const cookieValue = cookies.get("refresh_token").key;

          let params = {
            username,
            cookieValue
          };
          console.log("JWT expired, create new JWT using refresh token", params);
          await axios.post("/auth/refresh_token/update", params,
            {
                headers: { "Content-Type": "application/json"
                }
          })
          .then(response => {
            localStorage.setItem('currentUser', JSON.stringify(response.data));
            currentUserSubject.next(JSON.parse(localStorage.getItem('currentUser')));
            console.log("jwt refreshed", response.data);
            return response;
          }).catch(err=> {
            logout();
          })

     }

    }
    response = "DONE"
    return response;
}

async function login(username, password) {
    const cookies = new Cookies();
    var refresh_token_data = "";
    var name = "";
    var roles = "";
    var image = "";
//    console.log(JSON.stringify({username, password}));
//    const requestOptions = {
//        method: 'PUT',
//        credentials: 'include',
//        headers: {
//
//                    'Content-Type': 'application/json',
//                    'Accept': 'application/json'
//        },
//        redirect: 'follow',
//        body: JSON.stringify({ username, password })
//    };
    await axios.put('/auth/login', {username, password})
    .then(response => {
        console.log(response.data);
        localStorage.setItem('currentUser', JSON.stringify(response.data));
        name = response.data.username;
        roles = response.data.roles;
        image = response.data.avatar;
        authenticationService.loggedIn = true;
        currentUserSubject.next(JSON.parse(localStorage.getItem('currentUser')));
        console.log("loggedIn", authenticationService.loggedIn)
    }).catch(err => { console.log(err)
        authenticationService.loggedIn = false;
    });

    if(authenticationService.loggedIn === true) {
        //console.log(username)
        await axios.post("/auth/refresh_token/generate", username,
        {
            headers: { "Content-Type": "text/plain"},

        }).then(response => {
           console.log(response.data);
           refresh_token_data = response.data;

        })
    }
    if(refresh_token_data) {
        console.log("SetCookie refresh_token", refresh_token_data);

        cookies.set(refresh_token_data.name, {
            key: refresh_token_data.value},
            {path: '/',
             maxAge: refresh_token_data.maxAge,
             secure: refresh_token_data.secure});
        console.log(cookies.getAll());
    }

    console.log("AuthenticationService Login", image);
    return {name, roles, image};

}

function logout() {
    const cookies = new Cookies();
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    cookies.remove('refresh_token', {path: '/'})
    authenticationService.loggedIn = false;
    getNameSvc.setName("");
    getNameSvc.setRole("");
    getImgSvc.setImage("");
    currentUserSubject.next(null);
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("dataUrl");
    history.push('/');
}
