// Ensure NODE_ENV=test so React and react-dom load their development builds,
// which export React.act. Without this, React 19 production builds omit act,
// causing "TypeError: React.act is not a function" in @testing-library/react.
process.env.NODE_ENV = 'test';
