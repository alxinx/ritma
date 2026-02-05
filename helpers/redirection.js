
export default (rol)=>{
    if(rol === 'ADMIN'){
        //return '/app/admin'
        return './dash/'
    }else if(rol === 'USUARIO'){
        return '/user'

    }else{
        return '../'

    }
}

