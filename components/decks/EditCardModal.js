import { useRef } from "react";
import { memo } from "react";
import { View, Modal, useColorScheme, SafeAreaView, Pressable, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import FlipoButton from '../pressable/FlipoButton';
import EditableFlashcard from './EditableFlashcard';
const EditCardModal = memo(({
  card,
  editCard,
  i18n
}) => {
  const [flipped, setFlipped] = useState(false);
  const newCard = useRef(card);

  /*
    If the card prop changes, it means a different card is being edited/created.
    Hence this useEffect, which takes care of loading it into the modal.
  */
  useEffect(() => {
    newCard.current = card ? card : undefined;
  }, [card]);
  const submitCard = () => {
    editCard(newCard.current);
    setFlipped(false);
  };
  return <Modal className='justify-center items-center' transparent visible={card ? true : false} animationType='fade'>
        <BlurView className='align-center justify-center h-screen w-screen px-10' intensity={100} tint={useColorScheme()}>
          {/*Card*/}
          <View className='h-96 w-full -mt-40'>
            <EditableFlashcard card={card} flipped={flipped} setCard={setNewCard} i18n={i18n} />
          </View>
          <TouchableOpacity onPress={() => setFlipped(prevFlipped => !prevFlipped)} activeOpacity={0.8} className='mt-4 mb-8 items-center'>
            <FlipoButton className='w-20 px-4 align-center' textSize='text-lg'>Flip</FlipoButton>
          </TouchableOpacity>
          {/* Submit card edit button */}
          <TouchableOpacity onPress={() => submitCard()} activeOpacity={0.8}>
            <FlipoButton>Confirm</FlipoButton>
          </TouchableOpacity>
        </BlurView>
    </Modal>;
});
export default EditCardModal;