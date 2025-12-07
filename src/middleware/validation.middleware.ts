import { Request, Response, NextFunction } from 'express';
import { validateRegisterInput, validateLoginInput } from '../utils/validators';

export const validateRegister = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    validateRegisterInput(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateLogin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    validateLoginInput(req.body);
    next();
  } catch (error) {
    next(error);
  }
};