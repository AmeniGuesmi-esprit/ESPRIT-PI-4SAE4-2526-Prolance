package com.esprit.microservice.adsservice.kafka;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public final class TunisianGeoData {

    private TunisianGeoData() {
        // Utility class
    }

    public record GeoLocation(String ip, double latitude, double longitude, String city) { }

    private static final List<GeoLocation> LOCATIONS = List.of(
        // Tunis & Greater Tunis
        new GeoLocation("197.2.100.10",  36.8065,  10.1815, "Tunis"),
        new GeoLocation("197.2.100.20",  36.8442,  10.2137, "Ariana"),
        new GeoLocation("197.2.100.30",  36.7471,  10.2174, "Ben Arous"),
        new GeoLocation("197.2.100.40",  36.7948,  10.0982, "Manouba"),
        new GeoLocation("197.2.100.50",  36.8625,  10.1648, "La Marsa"),
        new GeoLocation("197.2.100.60",  36.8389,  10.1969, "Le Bardo"),
        new GeoLocation("197.2.100.70",  36.8870,  10.3228, "Sidi Bou Said"),
        new GeoLocation("197.2.100.80",  36.7660,  10.2310, "Hammam Lif"),
        new GeoLocation("197.2.100.90",  36.8190,  10.1660, "El Menzah"),
        new GeoLocation("197.2.100.100", 36.7300,  10.1900, "Ezzahra"),

        // Sfax
        new GeoLocation("197.3.100.10",  34.7406,  10.7603, "Sfax"),
        new GeoLocation("197.3.100.20",  34.7500,  10.7400, "Sfax Medina"),
        new GeoLocation("197.3.100.30",  34.7200,  10.7800, "Sakiet Ezzit"),
        new GeoLocation("197.3.100.40",  34.7600,  10.7100, "Sfax Ouest"),

        // Sousse
        new GeoLocation("197.4.100.10",  35.8254,  10.6369, "Sousse"),
        new GeoLocation("197.4.100.20",  35.8400,  10.6050, "Sousse Nord"),
        new GeoLocation("197.4.100.30",  35.7700,  10.8200, "Msaken"),

        // Monastir
        new GeoLocation("197.5.100.10",  35.7643,  10.8113, "Monastir"),
        new GeoLocation("197.5.100.20",  35.6700,  10.9000, "Moknine"),

        // Bizerte
        new GeoLocation("197.6.100.10",  37.2744,  9.8739,  "Bizerte"),
        new GeoLocation("197.6.100.20",  37.2500,  9.8500,  "Bizerte Sud"),
        new GeoLocation("197.6.100.30",  37.1600,  9.7900,  "Menzel Bourguiba"),

        // Kairouan
        new GeoLocation("197.7.100.10",  35.6781,  10.0963, "Kairouan"),
        new GeoLocation("197.7.100.20",  35.6600,  10.1100, "Kairouan Sud"),

        // Gabes
        new GeoLocation("197.8.100.10",  33.8815,  10.0982, "Gabes"),
        new GeoLocation("197.8.100.20",  33.9000,  10.0800, "Gabes Nord"),

        // Nabeul & Hammamet
        new GeoLocation("197.9.100.10",  36.4513,  10.7357, "Nabeul"),
        new GeoLocation("197.9.100.20",  36.4000,  10.6200, "Hammamet"),
        new GeoLocation("197.9.100.30",  36.4700,  10.7000, "Dar Chaabane"),
        new GeoLocation("197.9.100.40",  36.8300,  10.5900, "Soliman"),

        // Medenine & Djerba
        new GeoLocation("197.10.100.10", 33.3540,  10.5055, "Medenine"),
        new GeoLocation("197.10.100.20", 33.8076,  10.8451, "Djerba Houmt Souk"),
        new GeoLocation("197.10.100.30", 33.7500,  10.8900, "Djerba Midoun"),

        // Gafsa
        new GeoLocation("197.11.100.10", 34.4250,  8.7842,  "Gafsa"),
        new GeoLocation("197.11.100.20", 34.3800,  8.3200,  "Metlaoui"),

        // Tozeur
        new GeoLocation("197.12.100.10", 33.9197,  8.1335,  "Tozeur"),

        // Kebili
        new GeoLocation("197.13.100.10", 33.7072,  8.9697,  "Kebili"),
        new GeoLocation("197.13.100.20", 33.9500,  8.4000,  "Douz"),

        // Beja
        new GeoLocation("197.14.100.10", 36.7256,  9.1817,  "Beja"),

        // Jendouba
        new GeoLocation("197.15.100.10", 36.5012,  8.7802,  "Jendouba"),
        new GeoLocation("197.15.100.20", 36.7900,  8.5700,  "Tabarka"),

        // Kasserine
        new GeoLocation("197.16.100.10", 35.1676,  8.8365,  "Kasserine"),

        // Sidi Bouzid
        new GeoLocation("197.17.100.10", 35.0382,  9.4840,  "Sidi Bouzid"),

        // Tataouine
        new GeoLocation("197.18.100.10", 32.9297,  10.4518, "Tataouine"),

        // Mahdia
        new GeoLocation("197.19.100.10", 35.5047,  11.0622, "Mahdia"),
        new GeoLocation("197.19.100.20", 35.4000,  11.0400, "El Jem"),

        // Zaghouan
        new GeoLocation("197.20.100.10", 36.4029,  10.1429, "Zaghouan"),

        // Siliana
        new GeoLocation("197.21.100.10", 36.0849,  9.3708,  "Siliana")
    );

    public static GeoLocation getRandomLocation() {
        int index = ThreadLocalRandom.current().nextInt(LOCATIONS.size());
        return LOCATIONS.get(index);
    }
}
