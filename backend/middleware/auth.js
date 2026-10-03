import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'jyoti_navratra_solapur_secret_key_2026_mandal'
      );
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'वापरकर्ता सापडला नाही (User not found)' });
      }
      return next();
    } catch (error) {
      console.error('Auth verification error:', error.message);
      return res.status(401).json({ message: 'सत्र संपले आहे, कृपया पुन्हा लॉगिन करा (Invalid or expired token)' });
    }
  }

  return res.status(401).json({ message: 'बदल करण्यासाठी आधी लॉगिन करणे आवश्यक आहे (Not authorized, please login)' });
};

// Check if user is Admin
export const adminOnly = (req, res, next) => {
  const role = req.user?.role;
  if (req.user && (role === 'Admin' || role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    message: 'हा अधिकार फक्त मुख्य ॲडमिनसाठी राखीव आहे (Admin privileges required)',
  });
};

// Check if user is Treasurer or Admin
export const treasurerOrAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (req.user && (role === 'Admin' || role === 'admin' || role === 'Treasurer' || role === 'treasurer')) {
    return next();
  }
  return res.status(403).json({
    message: 'हा अधिकार फक्त खजिनदार किंवा ॲडमिनसाठी राखीव आहे (Treasurer or Admin privileges required)',
  });
};
