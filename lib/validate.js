export const isEmail = (s) => s.length <= 254 && /^\S+@\S+\.\S+$/.test(s);
