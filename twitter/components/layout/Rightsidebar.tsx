"use client";

import { Search } from 'lucide-react';
import React , {useState} from 'react';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '@/components/context/AuthContext';
import SubscriptionPage from '@/components/SubscriptionPage';
import { useLanguage } from '@/components/context/LanguageContext';


const suggestions = [
  {
    id: '1',
    username: 'narendramodi',
    displayName: 'Narendra Modi',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=narendramodi',
    verified: true
  },
  {
    id: '2',
    username: 'akshaykumar',
    displayName: 'Akshay Kumar',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=akshaykumar',
    verified: true
  },
  {
    id: '3',
    username: 'rashtrapatibhvn',
    displayName: 'President of India',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=presidentofindia',
    verified: true
  }
];

export default function RightSidebar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showSubscription, setShowSubscription] = useState(false);
  return (
    <div className="w-full p-4 space-y-4">

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          placeholder={t("common.search")}
          className="pl-12 bg-gray-900 border-gray-800 text-white placeholder-gray-400 rounded-full py-3"
        />
      </div>

      
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <h3 className="text-white text-xl font-bold mb-2">{t('subscription.subscribeToPremium')}</h3>
          <p className="text-gray-400 text-sm mb-4">
            {t('subscription.subscribeDesc')}
          </p>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full w-full" onClick={() => setShowSubscription(true)}>
            {t('subscription.subscribe')}
          </Button>
        </CardContent>
      </Card>

      {showSubscription && user && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-black border-gray-800 rounded-xl">
            <SubscriptionPage onClose={() => setShowSubscription(false)} user={user} />
          </div>
        </div>
      )}

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <h3 className="text-white text-xl font-bold mb-4">{t('common.youMightLike')}</h3>
          <div className="space-y-4">
            {suggestions.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.displayName} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-white font-semibold">{user.displayName}</span>
                      {user.verified && (
                        <div className="bg-blue-500 rounded-full p-0.5">
                          <svg className="h-3 w-3 text-white fill-current" viewBox="0 0 20 20">
                            <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">@{user.username}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-4"
                >
                  {t('common.follow')}
                </Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="text-blue-400 hover:text-blue-300 p-0 mt-4">
            {t('common.showMore')}
          </Button>
        </CardContent>
      </Card>

      <div className="p-4 text-xs text-gray-500 space-y-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline">{t('auth.termsOfService')}</a>
          <a href="#" className="hover:underline">{t('auth.privacyPolicy')}</a>
          <a href="#" className="hover:underline">{t('auth.cookiePolicy')}</a>
          <a href="#" className="hover:underline">{t('settings.accessibility')}</a>
          <a href="#" className="hover:underline">{t('common.adsInfo')}</a>
        </div>
        <div>© 2024 X Corp.</div>
      </div>
    </div>
  );
}