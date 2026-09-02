export function parseUserAgent(userAgent) {
    if (!userAgent) {
        return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' };
    }

    const ua = userAgent.toLowerCase();

    let browser = 'Unknown';
    if (ua.includes('edg/') || ua.includes('edge/')) {
        browser = 'Microsoft Edge';
    } else if (ua.includes('chrome/') && !ua.includes('edg/') && !ua.includes('opr/') && !ua.includes('brave')) {
        browser = 'Google Chrome';
    } else if (ua.includes('firefox/')) {
        browser = 'Mozilla Firefox';
    } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
        browser = 'Apple Safari';
    } else if (ua.includes('opr/') || ua.includes('opera/')) {
        browser = 'Opera';
    } else if (ua.includes('brave')) {
        browser = 'Brave';
    } else if (ua.includes('msie') || ua.includes('trident/')) {
        browser = 'Internet Explorer';
    }

    let os = 'Unknown';
    if (ua.includes('windows nt 10.0') || ua.includes('windows nt 11.0')) {
        os = 'Windows 10/11';
    } else if (ua.includes('windows nt 6.3')) {
        os = 'Windows 8.1';
    } else if (ua.includes('windows nt 6.2')) {
        os = 'Windows 8';
    } else if (ua.includes('windows nt 6.1')) {
        os = 'Windows 7';
    } else if (ua.includes('mac os x') || ua.includes('macos')) {
        os = 'macOS';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        os = 'iOS';
    } else if (ua.includes('android')) {
        os = 'Android';
    } else if (ua.includes('linux')) {
        os = 'Linux';
    } else if (ua.includes('ubuntu')) {
        os = 'Ubuntu';
    }

    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') && !ua.includes('tablet') || ua.includes('iphone') || ua.includes('ipod')) {
        deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
        deviceType = 'laptop';
    }

    return { browser, os, deviceType };
}

export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const cfConnectingIp = req.headers['cf-connecting-ip'];

    if (cfConnectingIp) return cfConnectingIp.split(',')[0].trim();
    if (realIp) return realIp.split(',')[0].trim();
    if (forwarded) return forwarded.split(',')[0].trim();

    return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

export function isMicrosoftBrowser(browser) {
    return browser === 'Microsoft Edge' || browser === 'Internet Explorer';
}

export function isChromeBrowser(browser) {
    return browser === 'Google Chrome';
}

export function isMobileDevice(deviceType) {
    return deviceType === 'mobile';
}

export function isWithinMobileLoginWindow() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const windowStart = 10 * 60;
    const windowEnd = 13 * 60;

    return currentMinutes >= windowStart && currentMinutes < windowEnd;
}

export function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}

export function getTimeWindowStatus() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const windowStart = 10 * 60;
    const windowEnd = 13 * 60;

    const isOpen = currentMinutes >= windowStart && currentMinutes < windowEnd;

    let timeUntilOpen = null;
    let timeUntilClose = null;

    if (!isOpen) {
        if (currentMinutes < windowStart) {
            timeUntilOpen = windowStart - currentMinutes;
        } else {
            timeUntilOpen = (24 * 60 - currentMinutes) + windowStart;
        }
        timeUntilClose = windowEnd - currentMinutes;
        if (timeUntilClose < 0) timeUntilClose += 24 * 60;
    } else {
        timeUntilClose = windowEnd - currentMinutes;
    }

    return {
        isOpen,
        windowStart: '10:00 AM',
        windowEnd: '1:00 PM',
        timeUntilOpen: timeUntilOpen ? `${Math.floor(timeUntilOpen / 60)}h ${timeUntilOpen % 60}m` : null,
        timeUntilClose: timeUntilClose ? `${Math.floor(timeUntilClose / 60)}h ${timeUntilClose % 60}m` : null,
    };
}

export function isWithinAudioTweetWindow() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const windowStart = 14 * 60;
    const windowEnd = 19 * 60;

    return currentMinutes >= windowStart && currentMinutes < windowEnd;
}

export function getAudioTweetWindowStatus() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const windowStart = 14 * 60;
    const windowEnd = 19 * 60;

    const isOpen = currentMinutes >= windowStart && currentMinutes < windowEnd;

    let timeUntilOpen = null;
    let timeUntilClose = null;

    if (!isOpen) {
        if (currentMinutes < windowStart) {
            timeUntilOpen = windowStart - currentMinutes;
        } else {
            timeUntilOpen = (24 * 60 - currentMinutes) + windowStart;
        }
        timeUntilClose = windowEnd - currentMinutes;
        if (timeUntilClose < 0) timeUntilClose += 24 * 60;
    } else {
        timeUntilClose = windowEnd - currentMinutes;
    }

    return {
        isOpen,
        windowStart: '2:00 PM',
        windowEnd: '7:00 PM',
        timeUntilOpen: timeUntilOpen ? `${Math.floor(timeUntilOpen / 60)}h ${timeUntilOpen % 60}m` : null,
        timeUntilClose: timeUntilClose ? `${Math.floor(timeUntilClose / 60)}h ${timeUntilClose % 60}m` : null,
    };
}