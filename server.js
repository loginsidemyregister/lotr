//Import JSON Dependencies
import express from "express";
import bodyParser from "body-parser";
const app = express();
app.use(bodyParser.json());

//Import Duffel Dependencies
import { Duffel } from "@duffel/api";
const duffel = new Duffel({
  token: process.env["DuffelKey"],
});

//OpenAI Dependencies for Generation
import OpenAI from "openai";
const OpenAIKey = process.env["OPENAIAPIKEY"];
const openai = new OpenAI({
  apiKey: OpenAIKey,
});

//Get Flights
app.get(
  "/getflights/:date/:departure/:arrival/:cabin/:people/:num",
  async (req, res) => {
    const { date, departure, arrival, cabin, people, num } = req.params;

    //Create Passenger Array
    const passengers = [];
    for (var i = 1; i <= people; i++) {
      passengers.push({ type: "adult" });
    }

    //Transfer City To Latitude, Longitude, and Radius
    const locationoptions = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Your job is to take the inputted cities and return the IATA codes of the most convenient airport IATA codes near in the requested format. You are given two cities, Origin and Destination, and you are supposed to return the most convenient airport IATA code corresponding to it. For example, SFO to Cupertino, or JFK to New York City. You can only respond in JSON with the content: Origin, and Destination. ONLY include an array in the format of: {} with Origin and Destination inside and nothing else including explanations, or filler content. Origin and Destination are singular IATA Airport codes, not multiple. JSON CAN NOT INCLUDE '''json",
        },
        {
          role: "user",
          content: `Origin: ${departure} Destination: ${arrival}`,
        },
      ],
      model: "gpt-3.5-turbo-1106",
    });

    const locationdata = locationoptions.choices[0].message.content;

    const OriginIATA = JSON.parse(locationdata).Origin;
    const DestinationIATA = JSON.parse(locationdata).Destination;

    const offerRequest = await duffel.offerRequests.create({
      slices: [
        {
          origin: OriginIATA,
          destination: DestinationIATA,
          departure_date: date,
        },
      ],
      passengers: passengers,
      cabin_class: cabin,
    });

    let offers = [];

    for (var i = 0; i <= num - 1; i++) {
      const offer = await duffel.offers.get(offerRequest.data.offers[i].id);
      offers.push(offer.data);
    }

    console.log(offers);
    res.send(offers);
  },
);

//Get Attractions
app.get(
  "/getaccomadations/:city/:indate/:outdate/:rooms/:people/:num",
  async (req, res) => {
    const { city, indate, outdate, rooms, people, num } = req.params;

    //Transfer City To Latitude, Longitude, and Radius
    const locationoptions = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Your job is to take the inputted city and return the latitude, longitude, and radius of said city. You can only respond in JSON with the content: long, lat, and rad. ONLY include an array in the format of: {} with long lat and rad inside, rad is ALWAYS reasonale and under 60, and nothing else including explanations, or filler content. JSON CAN NOT INCLUDE '''json",
        },
        { role: "user", content: city },
      ],
      model: "gpt-3.5-turbo-1106",
    });

    const locationdata = locationoptions.choices[0].message.content;
    console.log(locationdata);
    const location = JSON.parse(locationdata);

    let search = await duffel.stays.search({
      rooms: rooms,
      location: {
        radius: location.rad,
        geographic_coordinates: {
          longitude: location.long,
          latitude: location.lat,
        },
      },
      check_out_date: outdate,
      check_in_date: indate,
      adults: people,
    });

    //Change photo image quality
    let results = search.data.results;
    for (let i = 0; i < results.length; i++) {
      const accommodation = results[i].accommodation;

      if (accommodation && accommodation.photos) {
        for (let j = 0; j < accommodation.photos.length; j++) {
          const photo = accommodation.photos[j];

          if (photo.url) {
            photo.url = photo.url.replace("/max300/", "/max1080/");
          }
        }
      }
    }

    console.log(results);
    const formatted = results.slice(0, num);
    res.send(formatted);
  },
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
