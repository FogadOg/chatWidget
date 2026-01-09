# 🚀 Production Deployment Checklist

Complete this checklist before deploying the widget to production.

## 🔐 Security (Critical)

- [ ] **Restrict frame-ancestors** in `next.config.ts`
  ```typescript
  value: "frame-ancestors https://yoursite.com https://partner.com;"
  ```

- [ ] **Implement JWT validation** in embed page
  ```typescript
  // Validate clientId is a valid JWT
  const token = verifyJWT(clientId);
  if (!token.valid) return <UnauthorizedPage />;
  ```

- [ ] **Verify postMessage origins** in `widget.js`
  ```javascript
  if (!event.origin.includes('companin.tech')) return;
  ```

- [ ] **Set up rate limiting** on `/embed/*` routes

- [ ] **Enable CORS** only for trusted domains

- [ ] **Remove debug logging** from production code

## 🌐 Configuration

- [ ] **Update base URL** in `widget.js`
  ```javascript
  const baseUrl = isDev
    ? "http://localhost:3001"
    : "https://widget.companin.tech";
  ```

- [ ] **Set up environment variables**
  ```env
  NEXT_PUBLIC_API_BASE_URL=https://api.companin.tech
  NEXT_PUBLIC_WIDGET_URL=https://widget.companin.tech
  NODE_ENV=production
  ```

- [ ] **Configure domain** in hosting provider (Vercel/Railway/etc)

- [ ] **Set up SSL certificate** (usually automatic with hosting)

- [ ] **Update CORS settings** in backend API

## 📦 Build & Deploy

- [ ] **Test production build locally**
  ```bash
  npm run build
  npm start
  ```

- [ ] **Check for build errors**

- [ ] **Verify bundle size** (keep under 500KB)

- [ ] **Test all routes** work in production build

- [ ] **Deploy to staging** first (if available)

- [ ] **Test on staging** with real data

- [ ] **Deploy to production**

## 🎯 CDN & Performance

- [ ] **Upload widget.js to CDN**
  - AWS CloudFront
  - Cloudflare
  - Fastly

- [ ] **Version widget.js**
  ```
  https://cdn.companin.tech/widget-v1.0.0.js
  ```

- [ ] **Set cache headers**
  ```
  Cache-Control: public, max-age=31536000, immutable
  ```

- [ ] **Enable gzip/brotli compression**

- [ ] **Set up CDN purge strategy** for updates

- [ ] **Add SRI hash** for security
  ```html
  <script
    src="https://cdn.companin.tech/widget.js"
    integrity="sha384-..."
    crossorigin="anonymous"
  ></script>
  ```

## 📊 Monitoring & Analytics

- [ ] **Set up error tracking** (Sentry, Rollbar, etc)
  ```typescript
  // Add to Next.js
  Sentry.init({ dsn: '...' })
  ```

- [ ] **Add analytics** (Google Analytics, Mixpanel, etc)

- [ ] **Monitor API response times**

- [ ] **Set up uptime monitoring** (Pingdom, UptimeRobot)

- [ ] **Configure alerts** for errors/downtime

- [ ] **Track widget usage metrics**:
  - Widget loads
  - Messages sent
  - Conversations started
  - Response times

## 🧪 Testing

- [ ] **Cross-browser testing**
  - Chrome
  - Firefox
  - Safari
  - Edge
  - Mobile browsers

- [ ] **Mobile device testing**
  - iOS Safari
  - Android Chrome
  - Tablet devices

- [ ] **Load testing**
  - Concurrent users
  - Peak traffic scenarios

- [ ] **Security testing**
  - XSS vulnerabilities
  - CSRF protection
  - Injection attacks

- [ ] **Accessibility testing**
  - Screen readers
  - Keyboard navigation
  - ARIA labels

## 📱 Mobile Optimization

- [ ] **Test responsive behavior**

- [ ] **Optimize for small screens**

- [ ] **Test touch interactions**

- [ ] **Verify mobile performance** (< 3s load time)

- [ ] **Test on slow connections** (3G/4G)

## 🔄 Versioning & Updates

- [ ] **Document current version**

- [ ] **Create changelog**

- [ ] **Plan update strategy**:
  - How will clients get updates?
  - Backwards compatibility?
  - Breaking changes communication?

- [ ] **Set up version tracking** in widget.js
  ```javascript
  window.__COMPANIN_WIDGET_VERSION__ = '1.0.0';
  ```

## 📄 Documentation

- [ ] **Update user documentation** with production URLs

- [ ] **Create migration guide** from old implementation

- [ ] **Write troubleshooting guide**

- [ ] **Document API endpoints**

- [ ] **Create developer quickstart**

- [ ] **Add code examples** for common use cases

## 🚦 Launch Preparation

- [ ] **Notify existing users** about new widget

- [ ] **Update embed instructions** on website

- [ ] **Train support team** on new widget

- [ ] **Prepare rollback plan** (keep old version ready)

- [ ] **Set up feature flags** for gradual rollout

## 📝 Post-Launch

- [ ] **Monitor error rates** for first 24 hours

- [ ] **Collect user feedback**

- [ ] **Check performance metrics**

- [ ] **Review security logs**

- [ ] **Document any issues** encountered

- [ ] **Create post-mortem** if needed

## 🎯 Client Integration Updates

Update your clients' integration code:

### Before (development):
```html
<script
  src="http://localhost:3001/widget.js"
  data-client-id="..."
  data-dev="true"
></script>
```

### After (production):
```html
<script
  src="https://cdn.companin.tech/widget-v1.0.0.js"
  data-client-id="..."
  data-assistant-id="..."
  data-config-id="..."
></script>
```

## ✅ Final Checks

Before announcing the launch:

- [ ] All checklist items completed
- [ ] Production URL works correctly
- [ ] CDN delivering widget.js successfully
- [ ] Test integration on at least 3 real websites
- [ ] Performance metrics acceptable (< 3s load)
- [ ] Error rate < 0.1%
- [ ] Support team ready
- [ ] Rollback plan documented and tested
- [ ] Backup of previous version available

## 🎉 Ready to Launch!

Once all items are checked, you're ready to deploy to production!

### Launch Sequence:

1. Deploy Next.js app to production
2. Upload widget.js to CDN
3. Update DNS/SSL if needed
4. Test production URL
5. Update documentation
6. Notify users
7. Monitor for 24-48 hours
8. Celebrate! 🎊

---

## 📞 Support

If you encounter issues during deployment:

- Check [README-WIDGET.md](README-WIDGET.md) for troubleshooting
- Review [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)
- Contact DevOps team
- Create issue in repository

---

**Good luck with your deployment! 🚀**
