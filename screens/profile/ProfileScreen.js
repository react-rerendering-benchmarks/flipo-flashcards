import { useRef } from "react";
import { useCallback } from "react";
import { memo } from "react";
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, useColorScheme, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { A } from '@expo/html-elements';

// Color schemes
import colorSchemes from '../../assets/colorSchemes';

// Custom components
import FlipoText from '../../components/FlipoText';
import FlipoIcons from '../../components/FlipoIcons';
import FlipoFlatButton from '../../components/pressable/FlipoFlatButton';
import FlipoModal from '../../components/FlipoModal';
import { revokeAsync } from 'expo-auth-session';

// Localization
import * as Localization from 'expo-localization';
import * as locales from "../../localizations/profile/localizationProfileScreen";
import { I18n } from 'i18n-js';

// has to be here so the auth finishes in Expo Go
// (in native this does nothing)
WebBrowser.maybeCompleteAuthSession();
const ProfileScreen = memo(() => {
  const navigation = useNavigation();
  let colorScheme = colorSchemes[useColorScheme()];

  // localization setup
  const locale = useRef(Localization.locale);
  const i18n = new I18n(locales);
  i18n.enableFallback = true;
  i18n.translations = {
    ...locales
  };
  i18n.defaultLocale = "en";
  i18n.locale = locale.current;
  const privacyPolicyUrl = 'https://github.com/sevcak/flipo-flashcards/blob/master/privacy-policy.md';

  // header title setup
  navigation.setOptions({
    headerStyle: {
      backgroundColor: colorScheme['main'],
      borderBottomWidth: 3,
      borderBottomColor: colorScheme['ui'],
      height: 100
    }
  });

  // alert modal state
  const [alert, setAlert] = useState(null);

  // user data states
  const googleAuth = useRef(false);
  const [userName, setUserName] = useState(i18n.t('guest'));
  const [googleEmail, setGoogleEmail] = useState(null);
  const [userPicture, setUserPicture] = useState(null);

  // state containing the Google API access token
  const accessToken = useRef(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '1065386564540-6ubve5q36b79drp6fraa1ml3hs17p27p.apps.googleusercontent.com',
    iosClientId: '1065386564540-05fn7if915ch5ii7esldqp8i57t3k8u7.apps.googleusercontent.co',
    androidClientId: '1065386564540-t13e878c3bcaish2o7e0cjk5aanhb9u0.apps.googleusercontent.com',
    scopes: ['openid', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/drive.appdata']
  });

  // stores user data to the local storage
  const storeUserData = async data => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(data));
    } catch (e) {
      console.error('ProfileScreen: There was an error with saving the the user data.');
    }
  };

  // loads the user data from local storage
  const getUserData = async () => {
    try {
      let data = await AsyncStorage.getItem('userData');
      data = JSON.parse(data);
      if (data != null) {
        data.name ? setUserName(data.name) : setUserName('Guest');
        setUserPicture(data.picture);
      }
    } catch (e) {
      console.error('There was an error with loading the user data.');
    }
  };

  // returns custom deck data from local storage
  const getCustomDecks = async () => {
    try {
      let data = await AsyncStorage.getItem('customDecks');
      data = JSON.parse(data);
      if (data != null) {
        return data;
      } else if (data == null) {
        return {
          decks: []
        };
      }
    } catch (e) {
      console.error('ProfileScreen: There was an error with loading the decks.');
    }
  };

  // stores custom deck data to the local storage
  const storeCustomDecks = async data => {
    try {
      await AsyncStorage.setItem('customDecks', JSON.stringify(data));
    } catch (e) {
      console.error('ProfileScreen: There was an error with saving the decks.');
    }
  };
  const generateMultipartBody = data => {
    let boundary = 'request_body_boundary';
    let delimiter = `\r\n--${boundary}\r\n`;
    let close_delim = `\r\n--${boundary}--`;
    let contentType = `Content-Type: application/json\r\n\r\n`;
    let metadata = JSON.stringify(data.metadata);
    let fileContent = JSON.stringify(data.content);
    let ipartRequestBody = delimiter + contentType + metadata + delimiter + `Content-Type: ${data.mimeType}\r\n` + 'Content-Transfer-Encoding: utf-8\r\n' + '\r\n' + fileContent + close_delim;
    return ipartRequestBody;
  };

  // Checks, if the access token is valid
  const isGoogleTokenValid = async () => {
    const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken.current}`;
    let response = await fetch(url, {
      method: 'GET'
    });
    return response.status == '200' ? true : false;
  };

  // returns a list of files from Google Drive with specified name
  const getDecksGDrive = async () => {
    const fileName = 'flipo_customDecks.json';
    let query = `name='${fileName}' and mimeType='application/json and trashed=false`;
    let url = `https://www.googleapis.com/drive/v3/files?${query}&spaces=appDataFolder`;
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken.current}`
      }
    });
    let files = await response.json();
    return files.files;
  };

  // imports custom deck data from the user's Google Drive to local storage
  const importDecksGDrive = async () => {
    // displays a modal so the user has to wait until done
    setAlert(<FlipoModal title={i18n.t('pleaseWait')} visible={true} noDefaultButton>
          <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
            {i18n.t('importingGDrive')}
          </FlipoText>
        </FlipoModal>);
    const files = await getDecksGDrive();
    if (files.length > 0) {
      let file = files[0];
      let fileId = file.id;
      let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      let downloadResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken.current}`
        }
      });
      let fileContent = await downloadResponse.text();
      fileContent = JSON.parse(fileContent);
      storeCustomDecks(fileContent);

      // removes modal
      setAlert(null);
    } else {
      setAlert(<FlipoModal title={i18n.t('cantImport')} visible={true} onButtonPress={useCallback(() => {
        setAlert(null);
      }, [setAlert])}>
          <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
            {i18n.t('noDecksGDrive')}
          </FlipoText>
        </FlipoModal>);
    }
  };

  // deletes the custom decks file from the user's Google Drive, if it exists
  const deleteDecksGDrive = async () => {
    const files = await getDecksGDrive();

    // if a custom decks file exists, delete it
    if (files.length > 0) {
      console.log('ProfileScreen: Decks file found on Google Drive, deleting it...');
      let file = files[0];
      const fileId = file.id;
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
      let response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken.current}`
        }
      });
    }
  };

  // exports custom deck data to the user's Google Drive  
  const exportDecksGDrive = async () => {
    // displays a modal so the user has to wait until done
    setAlert(<FlipoModal title={i18n.t('pleaseWait')} visible={true} noDefaultButton>
          <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
            {i18n.t('exportingGDrive')}
          </FlipoText>
        </FlipoModal>);
    await deleteDecksGDrive();
    const data = {
      name: 'flipo_customDecks.json',
      mimeType: 'application/json',
      metadata: {
        name: 'flipo_customDecks.json',
        parents: ['appDataFolder']
      },
      content: await getCustomDecks()
    };
    const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.current}`,
        'Content-Type': 'multipart/related; boundary=request_body_boundary',
        'Content-Transfer-Encoding': 'utf-8'
      },
      body: generateMultipartBody(data)
    });
    setAlert(null);
  };

  // updates the user info states from their Google account info
  const fetchUserInfo = async () => {
    let response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken.current}`
      }
    });
    const userInfo = await response.json();

    // doesn't change the user's if it was manually set
    if (userName == 'Guest' || userName == i18n.t('guest')) {
      setUserName(userInfo.given_name);
    }
    setGoogleEmail(userInfo.email);
    let picture = userInfo.picture;
    picture = picture.slice(0, picture.lastIndexOf('='));
    setUserPicture(picture);
    storeUserData({
      name: userInfo.given_name,
      picture: picture
    });
  };

  // handles clicking on the 'Sign in using Google' button
  const googleSignIn = () => {
    // displays the privacy policy warning modal before allowing the user to sign in
    setAlert(privacyPolicyModal);
  };

  // gets rid of the Google API access token
  const googleSignOut = async () => {
    if (!googleAuth.current) {
      console.error("googleSignOut: Not logged into Google. Therefore it is not possible to log out.");
    } else {
      await revokeAsync({
        token: accessToken.current
      }, {
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke'
      });
      accessToken.current = null;
      googleAuth.current = null;
    }
  };

  // Modal to double-check the user's decision
  // to import decks from Google Drive 
  const importGDriveModal = <FlipoModal title={i18n.t('warning')} visible={true} onButtonPress={useCallback(() => {
    setAlert(null);
    importDecksGDrive();
  }, [setAlert])} buttonText={i18n.t('proceed')} cancelButton cancelButtonText={i18n.t('cancel')} onCancelPress={useCallback(() => {
    setAlert(null);
  }, [setAlert])}>
      <View className='space-y-4'>
        <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
          {i18n.t('importGDriveWarning01')}
        </FlipoText>
        <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
          {i18n.t('wantToProceed')}
        </FlipoText>
      </View>
    </FlipoModal>;

  // Modal to double-check the user's decision
  // to export decks to Google Drive
  const exportGDriveModal = <FlipoModal title={i18n.t('warning')} visible={true} onButtonPress={useCallback(() => {
    setAlert(null);
    exportDecksGDrive();
  }, [setAlert])} buttonText={i18n.t('proceed')} cancelButton cancelButtonText={i18n.t('cancel')} onCancelPress={useCallback(() => {
    setAlert('');
  }, [setAlert])}>
      <View className='space-y-4'>
        <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
          {i18n.t('exportGDriveWarning01')}
        </FlipoText>
        <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
          {i18n.t('wantToProceed')}
        </FlipoText>
      </View>
    </FlipoModal>;

  // Modal to inform the user about the Privacy Policy
  const privacyPolicyModal = <FlipoModal title={i18n.t('warning')} visible={true} onButtonPress={useCallback(() => {
    setAlert(null);
    promptAsync({
      /*useProxy: true, */showInRecents: true
    });
  }, [setAlert])} buttonText='OK' cancelButton cancelButtonText={i18n.t('cancel')} onCancelPress={useCallback(() => {
    setAlert(null);
  }, [setAlert])}>
      <View className='space-y-4'>
        <FlipoText weight='medium' className='text-center text-lg text-primary dark:text-primary-dark'>
          {i18n.t('privacyPolicyWarning01')}
          <A href={privacyPolicyUrl}>
            <FlipoText className='text-green text-lg underline'>
              {i18n.t('privacyPolicy')}
            </FlipoText>
          </A>
          {i18n.t('privacyPolicyWarning02')}
        </FlipoText>
      </View>
    </FlipoModal>;

  // If a profile picture is loaded, it has to get a background,
  // so the default profile icon doesn't clip from underneath.
  //
  // This is done instead of hiding the default icon so that in the case
  // the picture can't be loaded, the profile icon isn't blank.
  const [pictureBackground, setPictureBackground] = useState('');

  // Buttons that appear if user is logged in with Google
  const loggedInOptions = googleAuth.current ? <View>
        <FlipoFlatButton type='setting' title='Google account' value={googleEmail} />
        <FlipoFlatButton type='google-action' onPress={() => setAlert(exportGDriveModal)}>
          {i18n.t('exportGDrive')}
        </FlipoFlatButton>
        <FlipoFlatButton type='google-action' onPress={() => setAlert(importGDriveModal)}>
          {i18n.t('importGDrive')}
        </FlipoFlatButton>
        <FlipoFlatButton type='google-action' onPress={() => googleSignOut()} textClassName='text-alert'>
          {i18n.t('googleSignOut')}
        </FlipoFlatButton>
      </View> : <FlipoFlatButton type='googleLogin' text={i18n.t('googleLogin')} onPress={() => googleSignIn()} />;

  // Size of the profile picture/icon
  const pfpSize = Dimensions.get('window').width * 0.5;

  // on successful Google auth
  useEffect(() => {
    if (response?.type === 'success') {
      accessToken.current = response.authentication.accessToken;
      accessToken.current && fetchUserInfo();
      googleAuth.current = true;
    }
  }, [response, accessToken.current]);
  useEffect(() => {
    getUserData();
  }, []);

  // logs the user out if the access token has expired
  useEffect(() => {
    const interval = setInterval(() => {
      if (accessToken.current) {
        console.log('ProfileScreen: Checking if access key is valid');
        if (!isGoogleTokenValid()) {
          accessToken.current = null;
          googleAuth.current = false;
        }
      }
    }, 600000);
    return () => clearInterval(interval);
  }, []);

  // Profile Screen Component
  return <View className='bg-primary dark:bg-primary-dark'>
      {alert}
      <ScrollView className='-mt-9 relative' showsVerticalScrollIndicator={false} overScrollMode='never'>
        <View className='h-fit'>
          <View className="items-center justify-center p-10 space-y-6 w-full aspect-square">
            <View className='relative'>
              <View className={`absolute bottom-0 left-0 z-10 ${pictureBackground}`}>
                <Image source={{
                uri: `${userPicture}=s${pfpSize}-c`
              }} className='rounded-full' style={{
                height: pfpSize,
                width: pfpSize
              }} onLoad={() => setPictureBackground('bg-primary dark:bg-primary-dark')} />
              </View>
              <FlipoIcons name='profile' size={pfpSize} color={colorSchemes['dark'].green} />
            </View>
            <FlipoText weight='bold' className="text-4xl">{userName}</FlipoText>
          </View>
          {/* Buttons */}
          <View className='border-t-2 border-ui dark:border-ui-dark'>
            <FlipoFlatButton type='setting' title='Name' value={userName} />
            {loggedInOptions}
          </View>
        </View>
      </ScrollView>
      <View className='h-screen'></View>
    </View>;
});
export default ProfileScreen;