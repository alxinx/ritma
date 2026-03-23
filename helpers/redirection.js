
export default (rol)=>{
    if(rol === 'ADMIN'){
        //return '/app/admin'
        return process.env.ADMIN_LINK
    }else if(rol === 'USUARIO'){
        return process.env.USER_LINK

    }else{
        return '../'

    }
}

