export const isEmail = (s: string) => s.length <= 254 && /^\S+@\S+\.\S+$/.test(s);
