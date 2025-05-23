import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const BirdWatchingBirdObject = ({
  bird,
  style,
  hideLabel,
  hideImage,
  muteBirdSounds,
}) => {
  const [labelToggle, setLabelToggle] = useState(hideLabel);
  const [imageToggle, setImageToggle] = useState(hideImage);

  return (
    <motion.div
      className="bird-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      onClick={() => {
        console.log("Bird clicked");
        setLabelToggle(false);
        setImageToggle(false);
      }}
      style={style}
    >
      {!imageToggle ? (
        <Image
          width={500}
          height={500}
          style={{
            width: 100,
            height: 100,
            borderRadius: 200,
            backgroundColor: "black",
            borderWidth: 5,
            borderColor: "white",
          }}
          src={bird.image}
          alt={bird.name}
          className="bird-image"
        />
      ) : (
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 200,
            backgroundColor: "black",
            borderWidth: 5,
            borderColor: "white",
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
          }}
        >
          <p
            style={{
              fontSize: 60,
              color: "white",
              textAlign: "center",
              marginTop: 10,
              marginBottom: 10,
              fontWeight: "bold",
              fontFamily: "Arial, sans-serif",
            }}
          >
            ?
          </p>
        </div>
      )}

      {!labelToggle ? (
        <h3
          style={{
            marginTop: 10,
            backgroundColor: "black",
            padding: 10,
            paddingTop: 0,
            paddingBottom: 0,
            borderRadius: 200,
            fontWeight: "bold",
            fontSize: 16,
            color: "white",
            textAlign: "center",
          }}
        >
          {bird.name}
        </h3>
      ) : (
        <h3
          style={{
            flex: 1,
            marginTop: 10,
            backgroundColor: "black",
            padding: 10,
            paddingTop: 0,
            paddingBottom: 0,
            borderRadius: 200,
            fontWeight: "bold",
            fontSize: 16,
            color: "white",
            textAlign: "center",
          }}
        >
          ???
        </h3>
      )}

      {/* Display the audio player if the soundUrl is available */}
      {!muteBirdSounds && (
        <audio autoPlay>
          <source src={bird.audio} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </motion.div>
  );
};

export default BirdWatchingBirdObject;
