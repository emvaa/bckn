  import bcrypt from 'bcrypt';
   import jwt from 'jsonwebtoken';

   // Clave secreta para JWT (en producción esto va en .env)
   const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_super_secreta_12345';

   // ENCRIPTAR CONTRASEÑA
   export const hashPassword = async (password: string): Promise<string> => {
     const salt = await bcrypt.genSalt(10);
     return bcrypt.hash(password, salt);
   };

   // VERIFICAR CONTRASEÑA
   export const comparePassword = async (
     password: string, 
     hashedPassword: string
   ): Promise<boolean> => {
     return bcrypt.compare(password, hashedPassword);
   };

   // GENERAR TOKEN JWT
   export const generateToken = (userId: number, rol: string): string => {
     return jwt.sign(
       { 
         userId, 
         rol 
       }, 
       JWT_SECRET, 
       { expiresIn: '7d' } // El token expira en 7 días
     );
   };

   // VERIFICAR TOKEN JWT
   export const verifyToken = (token: string): any => {
     try {
       return jwt.verify(token, JWT_SECRET);
     } catch (error) {
       return null;
     }
   };