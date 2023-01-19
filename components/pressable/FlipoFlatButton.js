import { View, TouchableOpacity } from 'react-native'
import React from 'react'
import FlipoText from '../FlipoText';

const FlipoFlatButton = ( props ) => {
  let buttonContent;

  if (props.type == undefined || props.type == 'text') {
    buttonContent = (
      <FlipoText className='text-lg' weight='semi-bold' >{props.children}</FlipoText>
    );
  } else if (props.type == 'setting') {
    if (props.setting == undefined || props.setting.title == undefined || props.setting.value == undefined) {
      console.warn("FlipoFlatButton of type 'setting' requires a 'setting' object as a prop "
      + "with 'title' and 'value' string properties. "
      + "FlipoFlatButton not rendered.");
      
      return undefined;
    }
    
    buttonContent = (
      <View>
        {/* setting title */}
        <FlipoText weight='medium' className='uppercase tracking-wider'>{props.setting.title}</FlipoText>
        {/* setting value */}
        <FlipoText weight='bold' className={`text-2xl text-green-dark`}>{props.setting.value}</FlipoText>
      </View>
    )
  } else if (props.type == 'action' || props.type == 'action-red') {
    buttonContent = (
      <FlipoText
        className={`
          text-lg uppercase text-center 
          text-${props.type == 'action-red' ? 'alert' : 'strong'}
          dark:text-${props.type == 'action-red' ? 'alert' : 'strong'}-dark
        `}
        weight='medium'
      >
          {props.children}
      </FlipoText>
    );
  } else if (props.type == 'custom') {
    buttonContent = (
      <View>{buttonContent}</View>
    ); 
  }

  return (props.onPress == undefined
    ? (
        <View className='border-ui dark:border-ui-dark border-b-2 p-4 min-h-[10vh] justify-center'>
          {buttonContent}
        </View>
      )
    : (
        <TouchableOpacity
          onPress={props.onPress}
          className='border-ui dark:border-ui-dark
            border-b-2 p-4 min-h-[10vh] justify-center'
        >
          {buttonContent}
        </TouchableOpacity>
      )
  );
}

export default FlipoFlatButton;