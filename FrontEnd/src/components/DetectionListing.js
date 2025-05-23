import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";

const DetectionListing = (props) => {
  return (
    <Link
      href={`/map?species=${props.name}#map`}
      className="mt-4 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-100 active:scale-95 flex items-center justify-between p-4 bg-white rounded-xl border bg-card text-card-foreground shadow"
      role="button"
    >
      <div
        style={{
          flexDirection: "row",
          alignItems: "center",
          display: "flex",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: 10,
          }}
        >
          {props.image !== "" ? (
            <Image
              alt="bird"
              src={props.image}
              width={500}
              height={500}
              style={{
                width: 100,
                height: 100,
                borderRadius: 200,
                backgroundColor: "black",
              }}
              placeholder="empty"
            />
          ) : (
            <div
              style={{
                width: 70,
                height: 70,
                marginRight: 10,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                display: "flex",
              }}
            >
              <FontAwesomeIcon
                style={{
                  fontSize: 60,
                }}
                size="2xl"
                icon={faCircleQuestion}
              />
            </div>
          )}
        </div>

        <div
          style={{
            paddingLeft: 10,
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            {props.name}
          </p>

          <div className="text-muted-foreground text-sm">
            <p
              style={{
                color: "gray",
              }}
            >
              Date: {props.timestamp.toDate().toLocaleDateString("en-GB")} at{" "}
              {props.timestamp.toDate().toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p
              style={{
                color: "gray",
              }}
            >
              Species: {props.species}
            </p>

            <div className="text-muted-foreground">
              Detected in: {props.location}
            </div>
            <p
              style={{
                color: "gray",
              }}
            >
              Confidence: {(props.confidence * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DetectionListing;
