# Troubleshooting Guide

This document provides guidance for resolving common issues in the LookEscolar system.

## Common Issues and Solutions

### Authentication Issues

#### Invalid Token Errors
- **Symptom**: Users receive "Invalid token" errors when accessing family galleries
- **Cause**: Expired or malformed tokens
- **Solution**: 
  1. Verify token format (minimum 20 characters)
  2. Check token expiration date in database
  3. Generate new token if needed using admin panel

#### Admin Login Failures
- **Symptom**: Unable to log into admin panel
- **Cause**: Incorrect credentials or account not configured as admin
- **Solution**:
  1. Verify email and password
  2. Check user role in Supabase Auth dashboard
  3. Ensure `user_metadata.role` is set to "admin"

### Photo Upload Issues

#### Large File Upload Failures
- **Symptom**: Photos fail to upload with size-related errors
- **Cause**: Files exceeding 10MB limit
- **Solution**:
  1. Compress images before upload
  2. Check file sizes client-side before processing
  3. Adjust server configuration if needed (not recommended)

#### Processing Timeouts
- **Symptom**: Upload process hangs or times out
- **Cause**: High server load or network issues
- **Solution**:
  1. Check server resource usage
  2. Verify network connectivity
  3. Retry upload during low-traffic periods

### Payment Processing Issues

#### Webhook Validation Failures
- **Symptom**: Payment status not updating in system
- **Cause**: Invalid webhook signatures or network issues
- **Solution**:
  1. Verify Mercado Pago webhook configuration
  2. Check webhook signature verification in logs
  3. Ensure server can receive external requests

#### Duplicate Payment Processing
- **Symptom**: Orders processed multiple times for single payment
- **Cause**: Missing idempotency handling
- **Solution**:
  1. Verify `mp_payment_id` uniqueness checks
  2. Check idempotency implementation in webhook handler
  3. Review payment processing logs

### Performance Issues

#### Slow Gallery Loading
- **Symptom**: Family galleries load slowly
- **Cause**: Large number of photos or inefficient queries
- **Solution**:
  1. Implement pagination or virtual scrolling
  2. Optimize database queries with proper indexing
  3. Check CDN configuration for image delivery

#### Admin Dashboard Lag
- **Symptom**: Admin dashboard responses are slow
- **Cause**: Complex queries or high data volume
- **Solution**:
  1. Review dashboard queries for optimization
  2. Implement caching for frequently accessed data
  3. Add database indexes for common query patterns

## Database Issues

### Connection Problems
- **Symptom**: Application cannot connect to database
- **Cause**: Incorrect credentials or network issues
- **Solution**:
  1. Verify Supabase connection parameters
  2. Check network connectivity to Supabase
  3. Ensure Supabase project is not paused

### RLS Policy Violations
- **Symptom**: Unexpected permission denied errors
- **Cause**: Incorrect Row Level Security policies
- **Solution**:
  1. Review RLS policies in Supabase dashboard
  2. Test queries with appropriate user roles
  3. Check policy conditions for logical errors

## Security Issues

### Rate Limiting Blocks
- **Symptom**: Requests blocked with 429 status
- **Cause**: Exceeding configured rate limits
- **Solution**:
  1. Review rate limiting configuration
  2. Check request patterns for legitimate high usage
  3. Adjust limits as needed for specific endpoints

### Security Header Violations
- **Symptom**: Browser blocks content due to security headers
- **Cause**: Incorrect Content Security Policy or other headers
- **Solution**:
  1. Review security headers in production deployment
  2. Check browser console for specific violations
  3. Update CSP and other headers as needed

## Environment Issues

### Missing Environment Variables
- **Symptom**: Application fails to start or functions incorrectly
- **Cause**: Required environment variables not set
- **Solution**:
  1. Check `.env.local` file for all required variables
  2. Verify environment variable names match expected values
  3. Ensure secrets are properly configured in production

### Version Compatibility Issues
- **Symptom**: Unexpected errors after updates
- **Cause**: Incompatible package versions
- **Solution**:
  1. Check `package.json` for version conflicts
  2. Run `npm outdated` to identify outdated packages
  3. Update dependencies carefully with testing

## Monitoring and Logs

### Accessing Application Logs
- **Development**: Check terminal output from `npm run dev`
- **Production**: Check hosting platform logs (Vercel, etc.)
- **Database**: Check Supabase logs for database-related issues

### Performance Monitoring
- **Web Vitals**: Monitor Core Web Vitals in browser dev tools
- **Database**: Use Supabase performance insights
- **API**: Monitor response times and error rates

## Emergency Procedures

### Database Recovery
1. Identify the issue and stop any processes that might worsen it
2. Check database backups and point-in-time recovery options
3. Restore from backup if necessary
4. Validate data integrity after recovery

### Security Incident Response
1. Immediately rotate any potentially compromised tokens or keys
2. Review logs for unauthorized access
3. Block suspicious IP addresses
4. Notify affected users if personal data was accessed
5. Document the incident and lessons learned